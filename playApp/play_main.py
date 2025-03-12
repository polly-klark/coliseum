import os, tempfile, logging, subprocess, psutil
from fastapi import FastAPI, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from subprocess import check_output

def get_pid(name):
    return check_output(["pidof",name])

app = FastAPI()

# Укажите разрешенные источники
origins = [
    "http://localhost:8000",  # ваш React фронтенд
    "http://127.0.0.1:8000",
    # Добавьте другие домены, если необходимо
]

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

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.post("/receive_file")
async def receive_file(request: Request):
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
    process = subprocess.run(['sudo', 'tcpreplay', '-i', 'ens33', temp_file_path])
    # return StreamingResponse(file_generator(request), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})
    return {"message": f"File {filename} received successfully"}

@app.get("/stop")
async def stop():
    for proc in psutil.process_iter(['pid', 'name']):
        if proc.info['name'] == 'tcpreplay':
            try:
                proc.terminate()
                print(f"Процесс остановлен")
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                print(f"Ошибка при остановке процесса")