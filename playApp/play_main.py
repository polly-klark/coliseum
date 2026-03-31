import os, tempfile, logging, subprocess, psutil, redis, asyncio, signal, traceback, dpkt, time, json
from fastapi import BackgroundTasks, FastAPI, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from subprocess import check_output
from scapy.all import rdpcap, wrpcap

def get_pid(name):
    return check_output(["pidof",name])

app = FastAPI()

# Подключение к Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Укажите разрешенные источники
# origins = [
#     "http://localhost:8000",  # ваш React фронтенд
#     "http://127.0.0.1:8000",
#     # Добавьте другие домены, если необходимо
# ]

origins = ["*"]

# Добавление CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Разрешенные источники
    allow_credentials=True,
    allow_methods=["*"],  # Разрешенные методы (GET, POST и т.д.)
    allow_headers=["*"],  # Разрешенные заголовки
)
        
# Настройка логирования
logging.basicConfig(filename='playApp.log', level=logging.INFO)
logger = logging.getLogger(__name__)

def build_tcpreplay_command(pcap_path, mode, params):
    base_cmd = ['sudo', 'tcpreplay', '-i', 'ens33']
    
    if mode == 'loop':
        base_cmd.extend(['--loop', str(params.get('loop_count', 1))])
    elif mode == 'topspeed':
        base_cmd.append('--topspeed')
    elif mode == 'mltiplier':
        base_cmd.extend(['--multiplier', str(params.get('multiplier', 1.0))])
    elif mode == 'pps':
        base_cmd.extend(['--pps', str(params.get('pps', 100))])
    # standart — без доп. параметров
    
    base_cmd.append(pcap_path)
    return base_cmd


async def run_tcpreplay_cmd(cmd: list, delay: float, attack_id: str, mode: str = "standart", mode_params: dict = None):
    """
    mode и mode_params опциональны для обратной совместимости
    """
    mode_params = mode_params or {}
    
    try:
        logger.info(f"🚀 [{attack_id}] Запуск: {' '.join(cmd)}")
        
        process = subprocess.Popen(cmd)
        pid = process.pid

        # ✅ Парсим loop
        loop_count = 1
        for i in range(len(cmd)):
            if cmd[i] == '--loop' and i + 1 < len(cmd):
                try:
                    loop_count = int(cmd[i + 1])
                    logger.info(f"[{attack_id}] Loop: {loop_count}")
                    break
                except ValueError:
                    break

        # ✅ Сохраняем ВСЕ данные в Redis
        r.set(f"tcpreplay:pid:{attack_id}", pid)
        r.set(f"tcpreplay:file:{attack_id}", cmd[-1])
        r.set(f"tcpreplay:start_time:{attack_id}", str(time.time()))
        r.set(f"tcpreplay:cmd:{attack_id}", json.dumps(cmd))
        r.set(f"tcpreplay:loops:{attack_id}", loop_count)
        r.set(f"tcpreplay:mode:{attack_id}", mode)           # ✅ Теперь работает!
        r.set(f"tcpreplay:mode_params:{attack_id}", json.dumps(mode_params))  # ✅ Работает!
        r.set(f"tcpreplay:attack:{pid}", attack_id)

        total_delay = delay * loop_count if loop_count > 1 else delay + 1
        logger.info(f"[{attack_id}] Ждём {total_delay:.1f}с")
        
        await asyncio.sleep(total_delay)

    except Exception as e:
        logger.error(f"run_tcpreplay[{attack_id}] ERROR: {e}")
    
    finally:
        pcap_path = cmd[-1] if cmd else None
        if pcap_path and os.path.exists(pcap_path):
            try:
                os.remove(pcap_path)
                logger.info(f"[{attack_id}] Удалён {pcap_path}")
            except Exception as e:
                logger.warning(f"[{attack_id}] Не удалён {pcap_path}: {e}")

def get_pcap_duration(file_path: str) -> float:
    packets = rdpcap(file_path)
    start_time = packets[0].time
    end_time = packets[-1].time
    duration = end_time - start_time
    return duration

def cut_pcap_after_offset(src_path: str, dst_path: str, offset_sec: float):
    with open(src_path, "rb") as f_in, open(dst_path, "wb") as f_out:
        reader = dpkt.pcap.Reader(f_in)
        writer = dpkt.pcap.Writer(f_out)

        t0 = None
        for ts, buf in reader:
            if t0 is None:
                t0 = ts  # время первого пакета в файле
            if ts - t0 >= offset_sec:
                writer.writepkt(buf, ts)

def estimate_topspeed_duration(pcap_path: str, interface_mbps: float = 1000) -> float:
    """
    Оценка времени topspeed: байты_pcap / скорость_интерфейса
    """
    import os
    file_size = os.path.getsize(pcap_path) * 8  # байты → биты
    estimated_sec = file_size / (interface_mbps * 1_000_000) * 1.5  # +50% запас
    return max(estimated_sec, 1.0)  # минимум 1 сек

def estimate_pps_duration(pcap_path: str, pps: int = 1000) -> float:
    """
    Оценка времени по PPS: общее_колич_пакетов / пакетов_в_секунду
    
    pps=1000  → 1000 пакетов/сек
    pps=10000 → 10k пакетов/сек (очень быстро!)
    """
    from scapy.all import rdpcap
    import os
    
    packets = rdpcap(pcap_path)
    packet_count = len(packets)
    
    if packet_count == 0:
        return 1.0
    
    estimated_sec = packet_count / pps * 1.2  # +20% запас на overhead
    return max(estimated_sec, 0.5)  # минимум 0.5 сек

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.post("/receive_file")
async def receive_file(request: Request, background_tasks: BackgroundTasks):
    # ✅ Получаем attack_id из HEADERS (от main сервера)
    attack_id = request.headers.get("attack-id")
    mode = request.headers.get("mode", "standart")
    mode_params = json.loads(request.headers.get("mode-params", "{}"))
    logger.info(f"📥 ПРОКСИ: файл для '{attack_id}', mode={mode}, mode_params={mode_params}")  # ← Теперь НЕ None!
    # Создаем временный файл для сохранения содержимого
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            async for chunk in request.stream():
                temp_file.write(chunk)

            temp_file_path = temp_file.name  # Сохраняем имя временного файла
            logger.info(f"Файл находится в {temp_file_path} для атаки {attack_id}")
            
        except Exception as e:
            logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
    filename = request.headers.get("filename")
    logger.info(f"Получаю файл {filename} для запуска")
    cmd = build_tcpreplay_command(temp_file_path, mode, mode_params)
    # Вычисляем длительность воспроизведения ДО запуска фоновой задачи
    if mode == "topspeed": 
        duration = str(estimate_topspeed_duration(temp_file_path))
    elif mode == "pps":
        pps_value = mode_params.get('pps', 1000)  # 2 или дефолт 1000
        duration = str(estimate_pps_duration(temp_file_path, pps_value))
    else: 
        duration = str(get_pcap_duration(temp_file_path))

    # Запуск процесса в фоновом режиме
    # В конце receive_file:
    background_tasks.add_task(
        run_tcpreplay_cmd, 
        cmd, 
        float(duration), 
        attack_id,
        temp_file_path,           # ✅ 4й аргумент!
        mode_params               # ✅ 5й аргумент!
    )

    # Возвращаем длительность проигрывания вместе с сообщением
    return {"message": f"File {filename} received successfully", "duration": duration, "attack_id": attack_id, "mode": mode}

# @app.post("/receive_file")
# async def receive_file(request: Request, background_tasks: BackgroundTasks):
#     # ✅ Получаем attack_id из HEADERS (от main сервера)
#     attack_id = request.headers.get("attack-id")
#     logger.info(f"📥 ПРОКСИ: файл для атаки '{attack_id}'")  # ← Теперь НЕ None!
#     # Создаем временный файл для сохранения содержимого
#     with tempfile.NamedTemporaryFile(delete=False) as temp_file:
#         try:
#             async for chunk in request.stream():
#                 temp_file.write(chunk)


#             temp_file_path = temp_file.name  # Сохраняем имя временного файла
#             logger.info(f"Файл находится в {temp_file_path} для атаки {attack_id}")

#         except Exception as e:
#             logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
#             raise HTTPException(status_code=500, detail="Internal Server Error")
#     filename = request.headers.get("filename")
#     logger.info(f"Получаю файл {filename} для запуска")
    
#     # Вычисляем длительность воспроизведения ДО запуска фоновой задачи
#     duration = str(get_pcap_duration(temp_file_path))


#     # Запуск процесса в фоновом режиме
#     background_tasks.add_task(run_tcpreplay, temp_file_path, float(duration), attack_id)


#     # Возвращаем длительность проигрывания вместе с сообщением
#     return {"message": f"File {filename} received successfully", "duration": duration, "attack_id": attack_id}

@app.post("/stop")
async def stop(data: dict):  # ✅ Принимаем данные!
    attack_id = data.get("attack_id")
    logger.info(f"🛑 Останавливаем атаку {attack_id}")
    
    # ✅ Получаем PID по attack_id
    pid_data = r.get(f'tcpreplay:pid:{attack_id}')
    if not pid_data:
        return {"message": f"Атака {attack_id} не найдена"}
    
    pid = int(pid_data.decode('utf-8'))
    mes = "Всё хорошо"
    
    try:
        process = psutil.Process(pid)
        process.terminate()
    except psutil.NoSuchProcess:
        mes = f"Процесс {pid} не найден"
    
    # ✅ Удаляем ВСЕ ключи Redis для этой атаки
    file_path = r.get(f'tcpreplay:file:{attack_id}')
    r.delete(f'tcpreplay:pid:{attack_id}')
    r.delete(f'tcpreplay:attack:{pid}')
    if file_path:
        file_path = file_path.decode('utf-8')
        if os.path.exists(file_path):
            os.remove(file_path)
    
    return {"message": f"{mes} (attack_id: {attack_id})"}

@app.post("/pause")
async def pause(data: dict):
    attack_id = data.get("attack_id")
    logger.info(f"⏸️ Пауза атаки {attack_id}")

    pid_data = r.get(f'tcpreplay:pid:{attack_id}')
    file_data = r.get(f'tcpreplay:file:{attack_id}')
    start_data = r.get(f'tcpreplay:start_time:{attack_id}')

    if not pid_data or not file_data or not start_data:
        logger.error(f"Атака {attack_id} не найдена или не запущена")
        return {"message": f"Атака {attack_id} не найдена или не запущена"}

    pid = int(pid_data.decode("utf-8"))
    src_path = file_data.decode("utf-8")
    start_time = float(start_data.decode("utf-8"))

    now = time.time()
    elapsed = max(0.0, now - start_time)

    logger.info(
        f"PAUSE[{attack_id}]: pid={pid}, file={src_path}, elapsed={elapsed:.3f} сек"
    )

    # 1) Останавливаем текущий tcpreplay
    try:
        process = psutil.Process(pid)
        process.terminate()
        logger.info(f"PAUSE[{attack_id}]: terminate PID={pid}")
    except psutil.NoSuchProcess:
        logger.warning(f"PAUSE[{attack_id}]: процесс {pid} уже не найден")

    # 2) Режем pcap и сохраняем в новый временный файл
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pcap") as tmp:
        new_path = tmp.name

    try:
        cut_pcap_after_offset(src_path, new_path, elapsed)
        logger.info(f"PAUSE[{attack_id}]: урезанный файл сохранён в {new_path}")
    except Exception as e:
        logger.error(f"PAUSE[{attack_id}]: ошибка при нарезке pcap: {e}")
        return {"error": f"pcap_cut_failed: {e}"}

    # 3) Старый pcap можно удалить, если он тоже временный
    try:
        if os.path.exists(src_path):
            os.remove(src_path)
            logger.info(f"PAUSE[{attack_id}]: удалён старый файл {src_path}")
    except Exception as e:
        logger.warning(f"PAUSE[{attack_id}]: не удалось удалить {src_path}: {e}")

    # 4) Обновляем Redis: новый файл, убираем pid, start_time сбросим при следующем запуске
    r.set(f"tcpreplay:file:{attack_id}", new_path)
    r.delete(f"tcpreplay:pid:{attack_id}")
    r.delete(f"tcpreplay:attack:{pid}")
    r.delete(f"tcpreplay:start_time:{attack_id}")

    return {
        "message": f"Атака {attack_id} поставлена на паузу",
        "attack_id": attack_id,
        "elapsed": elapsed,
        "pcap": new_path,
    }

@app.post("/resume")
async def resume(data: dict, background_tasks: BackgroundTasks):
    attack_id = data.get("attack_id")
    logger.info(f"▶️ Возобновляем {attack_id}")
    
    # ✅ 1. Проверяем наличие обрезанного файла
    file_data = r.get(f"tcpreplay:file:{attack_id}")
    if not file_data:
        return {"error": "Файл не найден (атака не на паузе?)"}
    
    pcap_path = file_data.decode("utf-8")
    
    # ✅ 2. Получаем параметры режима
    mode = r.get(f"tcpreplay:mode:{attack_id}") or "standart"
    mode_params_json = r.get(f"tcpreplay:mode_params:{attack_id}") or "{}"
    mode_params = json.loads(mode_params_json)
    
    # ✅ 3. Вычисляем длительность обрезанного файла
    if mode == "topspeed":
        duration = estimate_topspeed_duration(pcap_path)
    elif mode == "pps":
        pps = mode_params.get('pps', 1000)
        duration = estimate_pps_duration(pcap_path, pps)
    else:
        duration = get_pcap_duration(pcap_path)
    
    # ✅ 4. Запускаем с тем же кодом!
    cmd = build_tcpreplay_command(pcap_path, mode, mode_params)
    background_tasks.add_task(
        run_tcpreplay_cmd, 
        cmd, 
        float(duration), 
        attack_id,
        pcap_path,           # ✅ 4й аргумент!
        mode_params               # ✅ 5й аргумент!
    )
    
    logger.info(f"🚀 [{attack_id}] Запущен новый процесс с {pcap_path}")
    
    return {
        "message": f"Возобновлено ({duration:.1f}с осталось)",
        "duration": duration,
        "attack_id": attack_id
    }

@app.get("/status/{attack_id}")
async def get_status(attack_id: str):
    pid_data = r.get(f'tcpreplay:pid:{attack_id}')
    if not pid_data:
        return {"error": "Атака не найдена"}
    
    pid = int(pid_data.decode())
    logger.info(f"Сейчас здесь будет статус атаки {attack_id}")
    try:
        if psutil.pid_exists(pid):
            process = psutil.Process(pid)
            info = {
                "pid": pid,
                "alive": True,
                "status": process.status(),
                "cpu": process.cpu_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "threads": len(process.threads()),
                # "connections": len(process.connections()),
                "create_time": process.create_time(),
            }
            logger.info(f"STATUS[{attack_id}]: {info}")
            return info
        else:
            logger.info(f"STATUS[{attack_id}]: pid={pid}, alive=False")
            return {"pid": pid, "alive": False}
    except Exception as e:
        logger.error(
            "STATUS[%s] ERROR type=%s repr=%r traceback=%s",
            attack_id,
            type(e).__name__,
            e,
            traceback.format_exc(),
        )
        return {"error": f"{type(e).__name__}: {e}"}