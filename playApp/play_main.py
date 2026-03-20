import os, tempfile, logging, subprocess, psutil, redis, asyncio
from fastapi import BackgroundTasks, FastAPI, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from subprocess import check_output
from scapy.all import rdpcap

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

async def run_tcpreplay(temp_file_path: str, delay: float, attack_id: str):
    try:
        process = subprocess.Popen(['sudo', 'tcpreplay', '-i', 'ens33', temp_file_path])
        pid = process.pid
        r.set(f'tcpreplay:pid:{attack_id}', pid)     # pid по attack_id
        r.set(f'tcpreplay:attack:{pid}', attack_id)   # attack_id по pid
        r.set('file:path', temp_file_path)
        await asyncio.sleep(delay + 1)

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

def get_pcap_duration(file_path: str) -> float:
    packets = rdpcap(file_path)
    start_time = packets[0].time
    end_time = packets[-1].time
    duration = end_time - start_time
    return duration

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.post("/receive_file")
async def receive_file(request: Request, background_tasks: BackgroundTasks):
    # ✅ Получаем attack_id из HEADERS (от main сервера)
    attack_id = request.headers.get("attack-id")
    logger.info(f"📥 ПРОКСИ: файл для атаки '{attack_id}'")  # ← Теперь НЕ None!
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
    
    # Вычисляем длительность воспроизведения ДО запуска фоновой задачи
    duration = str(get_pcap_duration(temp_file_path))

    # Запуск процесса в фоновом режиме
    background_tasks.add_task(run_tcpreplay, temp_file_path, float(duration), attack_id)

    # Возвращаем длительность проигрывания вместе с сообщением
    return {"message": f"File {filename} received successfully", "duration": duration, "attack_id": attack_id}

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
    logger.info(f"⏸️ ПРОКСИ: пауза {attack_id}")
    
    pid_data = r.get(f'tcpreplay:pid:{attack_id}')
    if not pid_data:
        return {"error": f"Атака {attack_id} не найдена"}
    
    pid = int(pid_data.decode('utf-8'))
    try:
        os.kill(pid, signal.SIGSTOP)  # ✅ ПРИОСТАНОВИТЬ процесс!
        logger.info(f"✅ Процесс {pid} приостановлен")
        return {"status": "paused", "pid": pid}
    except Exception as e:
        return {"error": f"Ошибка паузы: {e}"}

@app.post("/resume")
async def resume(data: dict):
    attack_id = data.get("attack_id")
    logger.info(f"▶️ ПРОКСИ: возобновление {attack_id}")
    
    pid_data = r.get(f'tcpreplay:pid:{attack_id}')
    if not pid_data:
        return {"error": f"Атака {attack_id} не найдена"}
    
    pid = int(pid_data.decode('utf-8'))
    try:
        os.kill(pid, signal.SIGCONT)  # ✅ ПРОДОЛЖИТЬ процесс!
        logger.info(f"✅ Процесс {pid} возобновлён")
        return {"status": "running", "pid": pid}
    except Exception as e:
        return {"error": f"Ошибка возобновления: {e}"}