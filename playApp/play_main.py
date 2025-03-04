import os, tempfile, logging
from subprocess import check_output
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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

# Создаем генератор для чтения файла по частям
async def file_generator(grid_out):
    while True:
        chunk = await grid_out.read(1024)  # Читаем файл порциями по 1024 байта
        if not chunk:
            break
        yield chunk

# Настройка логирования
logging.basicConfig(filename='playApp.log', level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.get("/receive_file")
async def get_file(filename):
    logger.info(f"Получаю файл {filename} для запуска")
    return filename