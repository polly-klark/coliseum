import os, tempfile, logging
from subprocess import check_output
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

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
async def file_generator(request):
    # stream = request.stream()  # Если stream — это функция
    # Создаем временный файл для сохранения содержимого
    logger.info(f"Я сейчас в файловом генераторе")
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        logger.info(f"Я сейчас перед тру")
        try:
            logger.info(f"Я сейчас в тру")
            # Читаем данные из GridFS и записываем их во временный файл
            while True:
                chunk = request.stream.read(1024)  # Читаем порциями по 1024 байта
                if not chunk:
                    break
                temp_file.write(chunk)

            temp_file_path = temp_file.name  # Сохраняем имя временного файла
            logger.info(f"Файл находится в {temp_file_path}")
            
        except Exception as e:
            logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
        

# Настройка логирования
logging.basicConfig(filename='playApp.log', level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/hello")
async def get_hello():
    return("Hello world!")

@app.post("/receive_file")
async def receive_file(request: Request):
    file_generator(request)
    filename = request.headers.get("Content-Disposition")
    logger.info(f"Получаю файл {filename} для запуска")
    # return StreamingResponse(file_generator(request), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})
    return {"message": f"File {filename} received successfully"}