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
    mode_params = mode_params or {}
    
    try:
        logger.info(f"🚀 [{attack_id}] Запуск: {' '.join(cmd)}")
        # 🔥 ПРОВЕРЯЕМ time_to_next ИЗ Redis!
        time_to_next_data = r.get(f"tcpreplay:time_to_next:{attack_id}")
        if time_to_next_data:
            time_to_next = float(time_to_next_data)
            logger.info(f"⏳ Resume sleep: {time_to_next:.3f}s до следующего пакета")
            await asyncio.sleep(time_to_next)
            r.delete(f"tcpreplay:time_to_next:{attack_id}")  # Очищаем!
        else:
            logger.info("⏳ Нет time_to_next — запуск сразу")
        # ✅ 1. ПАРСИМ loop ДО запуска
        loop_count = 1
        for i in range(len(cmd)):
            if cmd[i] == '--loop' and i + 1 < len(cmd):
                loop_count = int(cmd[i + 1])
                logger.info(f"[{attack_id}] Loop: {loop_count}")
                break
        
        # ✅ 2. НОВОЕ ВРЕМЯ ПЕРЕД Popen()
        r.set(f"tcpreplay:start_time:{attack_id}", str(time.time()))
        
        # ✅ 3. Счётчик кругов
        if loop_count > 1:
            current_loop = int(r.get(f"tcpreplay:loops_current:{attack_id}") or 0) + 1
            r.set(f"tcpreplay:loops_current:{attack_id}", current_loop)
            logger.info(f"🔄 [{attack_id}] Круг {current_loop}/{loop_count}")
        else:
            r.delete(f"tcpreplay:loops_current:{attack_id}")
        
        # ✅ 4. Запуск
        process = subprocess.Popen(cmd)
        pid = process.pid
        
        # ✅ 5. Redis (start_time уже есть!)
        r.set(f"tcpreplay:pid:{attack_id}", pid)
        r.set(f"tcpreplay:file:{attack_id}", cmd[-1])
        # start_time — УЖЕ установлен!
        r.set(f"tcpreplay:cmd:{attack_id}", json.dumps(cmd))
        r.set(f"tcpreplay:loops:{attack_id}", loop_count)
        r.set(f"tcpreplay:mode:{attack_id}", mode)
        r.set(f"tcpreplay:mode_params:{attack_id}", json.dumps(mode_params))
        r.set(f"tcpreplay:attack:{pid}", attack_id)
        
        await asyncio.sleep(600)
        
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

def get_pcap_duration(pcap_path):
    try:
        packets = rdpcap(pcap_path)
        if not packets:
            return 0.0
        
        start_time = float(packets[0].time)  # ✅ float!
        end_time = float(packets[-1].time)   # ✅ float!
        return float(end_time - start_time)  # ✅ float!
    except Exception as e:
        logger.error(f"PCAP ошибка {pcap_path}: {e}")
        return 0.0

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

def cut_pcap_by_packets(src_path: str, dst_path: str, packet_count: int):
    """Scapy — создаёт ПОЛНЫЙ header!"""
    try:
        packets = rdpcap(src_path)
        logger.info(f"📦 Читаем {len(packets)} пакетов")
        
        if packet_count >= len(packets):
            shutil.copy(src_path, dst_path)  # Все пакеты
            return
        
        cut_packets = packets[:packet_count]
        wrpcap(dst_path, cut_packets)
        logger.info(f"✅ CUT {len(cut_packets)}/{packet_count} пакетов")
        
    except Exception as e:
        logger.error(f"Scapy ошибка: {e}")
        # Fallback — копируем
        shutil.copy(src_path, dst_path)

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

async def schedule_loop_resume(attack_id: str, original_path: str, mode: str, mode_params: dict, remaining_loops: int, delay: float):
    """Запуск оставшихся кругов с задержкой"""
    await asyncio.sleep(delay)
    
    original_duration = get_pcap_duration(original_path)
    params = mode_params.copy()
    params['loop_count'] = remaining_loops
    
    cmd = build_tcpreplay_command(original_path, "loop", params)
    # Создаём ВРЕМЕННЫЙ background_tasks
    from fastapi import BackgroundTasks
    temp_tasks = BackgroundTasks()
    temp_tasks.add_task(run_tcpreplay_cmd, cmd, delay, attack_id, mode, params)
    # Запускаем через event loop
    asyncio.create_task(temp_tasks())

def get_time_to_next_packet(pcap_path: str, elapsed_time: float) -> dict:
    """
    ТОЧНОЕ время ДО следующего пакета от паузы!
    
    Возвращает:
    {
        'packet_idx': номер следующего пакета,
        'next_packet_time': время следующего от начала,
        'time_since_last': сколько прошло после последнего,
        'time_to_next': ⏰ СКОЛЬКО ОСТАЛОСЬ ДО следующего!
    }
    """
    packets = rdpcap(pcap_path)
    if len(packets) < 2:
        return {'packet_idx': 0, 'time_to_next': 0.0, 'time_since_last': 0.0}
    
    t0 = float(packets[0].time)  # Время первого пакета
    
    # Находим последний пакет ДО паузы + следующий
    last_pkt_idx = 0
    next_pkt_idx = 1
    
    for i, pkt in enumerate(packets):
        pkt_time = float(pkt.time) - t0
        
        if pkt_time <= elapsed_time:
            last_pkt_idx = i  # Последний отправленный
        else:
            next_pkt_idx = i  # Следующий не отправленный
            break
    
    # 🔥 РАСЧЁТЫ!
    last_time = float(packets[last_pkt_idx].time) - t0
    next_time = float(packets[next_pkt_idx].time) - t0
    
    time_since_last = elapsed_time - last_time    # Прошло после последнего
    full_gap = next_time - last_time              # Полный gap между пакетами
    time_to_next = full_gap - time_since_last     # ⏰ ОСТАЛОСЬ!
    
    result = {
        'packet_idx': next_pkt_idx,
        'last_packet_time': last_time,
        'next_packet_time': next_time,
        'time_since_last': time_since_last,
        'full_gap': full_gap,
        'time_to_next': max(0.0, time_to_next)  # Не отрицательное
    }
    
    logger.info(f"⏱️ pause={elapsed_time:.3f}s последний=#{last_pkt_idx}({last_time:.3f}s) следующий=#{next_pkt_idx}({next_time:.3f}s) осталось={result['time_to_next']:.3f}s")
    
    return result

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
        mode,           # ✅ 4й аргумент!
        mode_params               # ✅ 5й аргумент!
    )

    # Возвращаем длительность проигрывания вместе с сообщением
    return {"message": f"File {filename} received successfully", "duration": duration, "attack_id": attack_id, "mode": mode}

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
    
    # ✅ ← ВСТАВЬ ЗДЕСЬ! (расчёт %)
    start_data = r.get(f"tcpreplay:start_time:{attack_id}")
    file_data = r.get(f"tcpreplay:file:{attack_id}")
    
    current_percent = 0.0
    if start_data and file_data:
        start_time = float(start_data.decode())
        now = time.time()
        elapsed = max(0.0, now - start_time)
        
        pcap_path = file_data.decode()
        total_duration = get_pcap_duration(pcap_path)
        
        current_percent = min(100.0, (elapsed / total_duration * 100) if total_duration > 0 else 0)
        
        # ✅ СОХРАНЯЕМ для Frontend!
        r.set(f"tcpreplay:percent:{attack_id}", str(int(current_percent)))
        r.set(f"tcpreplay:status:{attack_id}", "stopped")
        logger.info(f"🛑 [{attack_id}] Остановлен на {current_percent:.1f}%")
    # ← КОНЕЦ ВСТАВКИ
    
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

    # ✅ ПЕРЕМЕННЫЕ!
    pid = int(pid_data.decode("utf-8"))
    src_path = file_data.decode("utf-8")
    start_time = float(start_data.decode("utf-8"))
    
    now = time.time()
    elapsed = max(0.0, now - start_time)
    
    # 🔥 ✅ TERMINATE() — ВСТАВИТЬ ЗДЕСЬ!
    try:
        process = psutil.Process(pid)
        process.terminate()
        logger.info(f"PAUSE[{attack_id}]: terminate PID={pid}")
        # await asyncio.sleep(0.1)  # Даём время умереть
        # if process.is_running():
        #     process.kill()  # Жёсткое убийство!
        #     logger.info(f"💀 PID {pid} kill()")
    except psutil.NoSuchProcess:
        logger.warning(f"Процесс {pid} уже мёртв")
    except Exception as e:
        logger.error(f"terminate ошибка: {e}")
    
    try:
        # ✅ ЧИТАЕМ ПАРАМЕТРЫ РЕЖИМА
        mode_data = r.get(f"tcpreplay:mode:{attack_id}")
        mode = mode_data.decode("utf-8") if mode_data else "standart"
        
        mode_params_data = r.get(f"tcpreplay:mode_params:{attack_id}")
        mode_params = json.loads(mode_params_data.decode("utf-8") if mode_params_data else "{}")
        
        cut_offset = elapsed
        cut_method = "time"
        
        # 🔥 РЕЖИМОВАЯ ЛОГИКА
        if mode == "multiplier":
            multiplier = float(mode_params.get("multiplier", 1.0))
            cut_offset = elapsed * multiplier
            logger.info(f"MULTIPLIER x{multiplier}: effective={cut_offset:.1f}s")
            
        elif mode == "pps":
            pps = float(mode_params.get("pps", 100))
            cut_offset = int(elapsed * pps)
            logger.info(f"PPS {pps}: {cut_offset} пакетов")
            cut_method = "packets"
            
        elif mode == "loop":
            logger.info("LOOP: обычное время одного круга")
            cut_method = "time"
        
        logger.info(f"🔪 Режем {cut_method} offset={cut_offset}")
        
        # ✅ СОЗДАЁМ ФАЙЛ
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pcap") as tmp:
            new_path = tmp.name
        
        # ✅ ОБРЕЗАЕМ
        if cut_method == "packets":
            cut_pcap_by_packets(src_path, new_path, cut_offset)
        else:
            gap_info = get_time_to_next_packet(src_path, cut_offset)
            # 🔥 СОХРАНЯЕМ time_to_next в Redis!
            r.set(f"tcpreplay:time_to_next:{attack_id}", gap_info['time_to_next'])
            logger.info(f"⏳ До следующего пакета: {gap_info['time_to_next']:.3f}s (прошло {gap_info['time_since_last']:.3f}s из {gap_info['full_gap']:.3f}s)")
            
            # ✅ ТОЧНАЯ обрезка
            cut_pcap_after_offset(src_path, new_path, cut_offset)
        
        logger.info(f"✅ Обрезка OK: {new_path}")
        
        # ✅ LOOP original_file
        if mode == "loop":
            original_path_data = r.get(f"tcpreplay:original_file:{attack_id}")
            if not original_path_data:
                r.set(f"tcpreplay:original_file:{attack_id}", src_path)
                logger.info(f"LOOP: оригинал сохранён {src_path}")
        
        # ✅ Redis
        r.set(f"tcpreplay:file:{attack_id}", new_path)
        
    except Exception as e:
        logger.error(f"❌ PAUSE[{attack_id}] КРИТИЧНАЯ ошибка: {e}")
        return {"error": f"pause_failed: {str(e)[:100]}"}

    # 3) Старый pcap можно удалить, если он тоже временный
    try:
        if mode != "loop" and os.path.exists(src_path):
            os.remove(src_path)
            logger.info(f"PAUSE[{attack_id}]: удалён старый файл {src_path} (не-loop)")
        elif mode == "loop":
            logger.info(f"PAUSE[{attack_id}]: LOOP — src_path {src_path} ОСТАВЛЯЕМ!")
    except Exception as e:
        logger.warning(f"PAUSE[{attack_id}]: не удалось удалить {src_path}: {e}")

    # 4) Обновляем Redis: новый файл, убираем pid, start_time сбросим при следующем запуске
    r.set(f"tcpreplay:file:{attack_id}", new_path)
    r.delete(f"tcpreplay:pid:{attack_id}")
    r.delete(f"tcpreplay:attack:{pid}")
    r.delete(f"tcpreplay:start_time:{attack_id}")

    return {
        "message": f"Пауза OK ({cut_method}, {cut_offset})",
        "attack_id": attack_id,
        "elapsed": elapsed,
        "cut_offset": cut_offset,
        "mode": mode
    }

@app.post("/resume")
async def resume(data: dict, background_tasks: BackgroundTasks):
    attack_id = data.get("attack_id")
    
    file_data = r.get(f"tcpreplay:file:{attack_id}")
    pcap_path = file_data.decode("utf-8")
    
    # ✅ ФИКС Redis!
    mode_data = r.get(f"tcpreplay:mode:{attack_id}")
    mode = mode_data.decode("utf-8") if mode_data else "standart"
    
    mode_params_data = r.get(f"tcpreplay:mode_params:{attack_id}")
    mode_params = json.loads(mode_params_data.decode("utf-8") if mode_params_data else "{}")
    
    # ✅ Длительность обрезанного файла
    duration = get_pcap_duration(pcap_path)  # Универсально!
    
    # ✅ ВСЕГДА НОВОЕ start_time при запуске!
    r.set(f"tcpreplay:start_time:{attack_id}", str(time.time()))
    
    if mode == "loop":
        original_data = r.get(f"tcpreplay:original_file:{attack_id}")
        if original_data:
            original_path = original_data.decode()
            # ✅ БЕЗОПАСНЫЙ int!
            loops_data = r.get(f"tcpreplay:loops:{attack_id}")
            current_loop_data = r.get(f"tcpreplay:loops_current:{attack_id}")
            
            original_loops = int(loops_data) if loops_data else 1
            current_loop = int(current_loop_data) if current_loop_data else 1
            
            remaining_loops = original_loops - current_loop
            
            logger.info(f"🔄 LOOP [{attack_id}] Доиграть + {remaining_loops} кругов (loops={original_loops}, current={current_loop})")
            
            # 1. Доиграть текущий (обрезанный)
            cmd1 = build_tcpreplay_command(pcap_path, "standart", mode_params)
            background_tasks.add_task(run_tcpreplay_cmd, cmd1, duration, attack_id, mode, mode_params)
            
            # 2. После — запустить оригинал с оставшимися
            if remaining_loops > 0:
                asyncio.create_task(schedule_loop_resume(attack_id, original_path, "loop", mode_params, remaining_loops, duration + 1))
            else:
                logger.info("✅ Последний круг — без schedule_loop_resume")
            
            # total_duration = duration + (get_pcap_duration(original_path) * remaining_loops)
        else:
            # Fallback
            cmd = build_tcpreplay_command(pcap_path, mode, mode_params)
            background_tasks.add_task(run_tcpreplay_cmd, cmd, duration, attack_id, mode, mode_params)
            # total_duration = duration
    else:
        # НЕ-loop — просто доиграть
        cmd = build_tcpreplay_command(pcap_path, mode, mode_params)
        background_tasks.add_task(run_tcpreplay_cmd, cmd, duration, attack_id, mode, mode_params)
        # total_duration = duration
    
    return {"message": "Возобновлено"}

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

@app.post("/stop_at_loop")
async def stop_at_loop(data: dict, background_tasks: BackgroundTasks):
    attack_id = data.get("attack_id")
    target_loop_raw = data.get("target_loop")
    
    # ✅ ПРОВЕРКА target_loop!
    if target_loop_raw is None:
        logger.error(f"❌ stop_at_loop: target_loop отсутствует в data={data}")
        raise HTTPException(400, "target_loop required")
    
    target_loop = int(target_loop_raw)
    
    logger.info(f"🛑 [{attack_id}] Остановка на круге {target_loop}")
    
    # Остальной код без изменений...
    current_loop = int(r.get(f"tcpreplay:loops_current:{attack_id}") or 0)
    total_loops = int(r.get(f"tcpreplay:loops:{attack_id}") or 1)
    
    if target_loop <= current_loop:
        return {"error": f"Уже прошли круг {target_loop}"}
    
    pcap_path = r.get(f"tcpreplay:file:{attack_id}")
    if not pcap_path:
        return {"error": "Файл не найден"}
    
    pcap_path = pcap_path.decode()
    elapsed_per_loop = get_pcap_duration(pcap_path)
    total_elapsed = elapsed_per_loop * (target_loop - 1)
    cut_path = cut_pcap_after_offset(pcap_path, total_elapsed)
    
    r.set(f"tcpreplay:file:{attack_id}", cut_path)
    r.set(f"tcpreplay:loops_current:{attack_id}", target_loop - 1)
    
    # Убиваем процесс
    pid = r.get(f"tcpreplay:pid:{attack_id}")
    if pid:
        try:
            os.kill(int(pid.decode()), signal.SIGKILL)
        except:
            pass
    
    return {"message": f"Остановлено перед кругом {target_loop}"}