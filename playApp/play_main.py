import os, tempfile, logging, subprocess, psutil, redis
from fastapi import BackgroundTasks, FastAPI, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from subprocess import check_output

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

def run_tcpreplay(temp_file_path: str):
    process = subprocess.Popen(['sudo', 'tcpreplay', '-i', 'ens33', temp_file_path])
    pid = process.pid
    r.set('tcpreplay:pid', pid)

    # Сделаю когда будет таймер наверное
    # finally:
    #     # Удаление файла после выполнения команды
    #     os.remove(temp_file_path)
    #     logger.info(f"Файл {temp_file_path} удален")

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.post("/receive_file")
async def receive_file(request: Request, background_tasks: BackgroundTasks):
    # Создаем временный файл для сохранения содержимого
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            async for chunk in request.stream():
                temp_file.write(chunk)

            temp_file_path = temp_file.name  # Сохраняем имя временного файла
            logger.info(f"Файл находится в {temp_file_path}")
            
        except Exception as e:
            logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
    filename = request.headers.get("filename")
    logger.info(f"Получаю файл {filename} для запуска")
    # Запуск процесса в фоновом режиме
    background_tasks.add_task(run_tcpreplay, temp_file_path)
    return {"message": f"File {filename} received successfully"}

@app.post("/stop")
async def stop():
    logger.info("Щас как остановлю")
    pid = r.get('tcpreplay:pid')
    pid = int(pid.decode('utf-8'))
    mes = "Всё хорошо"
    try:
        process = psutil.Process(pid)
        process.terminate()
    except psutil.NoSuchProcess:
        mes = f"Процесс {pid} не найден"
    return {"message": f"{mes}"}