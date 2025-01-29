from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
# from pymongo import MongoClient, database
from pydantic import BaseModel, Field
# import gridfs
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
# from passlib.context import CryptContext 
import gostcrypto, jwt, secrets, logging, tempfile, os
from datetime import datetime, timezone
import scapy.all as scapy

# Настройка логирования
logging.basicConfig(filename='app.log', level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройки приложения
app = FastAPI()

# Подключение к MongoDB
client = AsyncIOMotorClient('mongodb://localhost:27017/')
auth_db = client['auth_db']
db = client['test_gridfs']
bg = client['background']
adb = client['attack']
user_db = client['user_m']
admin_db = client['admin_m']
# print(isinstance(db, database.Database))  # Должно вернуть True
fs = AsyncIOMotorGridFSBucket(db)
fsa = AsyncIOMotorGridFSBucket(adb)
fsb = AsyncIOMotorGridFSBucket(bg)
fsadmin = AsyncIOMotorGridFSBucket(admin_db)
fsuser = AsyncIOMotorGridFSBucket(user_db)

# Модель пользователя
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    username: str
    hashed_password: str
    is_admin: bool  # Добавляем поле для роли

# # Настройки для хеширования паролей
# pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    password = password.encode('cp1251')
    return gostcrypto.gosthash.new('streebog256', data=password).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password

# JWT настройки
SECRET_KEY = secrets.token_hex(32)  # Генерирует 64-значный шестнадцатеричный ключ
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def rename_file(original_filename):
    # Разделяем имя файла на имя и расширение
    name, ext = os.path.splitext(original_filename)
    
    # Создаем новое имя файла, добавляя "_modified"
    new_filename = f"{name}_modified{ext}"

    return new_filename

# Создаем генератор для чтения файла по частям
async def file_generator(grid_out):
    while True:
        chunk = await grid_out.read(1024)  # Читаем файл порциями по 1024 байта
        if not chunk:
            break
        yield chunk

# Регистрация пользователя
@app.post("/register")
async def register(user: User):
    user.hashed_password = hash_password(user.hashed_password)
    await auth_db.users.insert_one(user.model_dump())
    return {"message": "User registered successfully"}

# Вход пользователя и получение токена
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await auth_db.users.find_one({"username": form_data.username})
    
    if not user or not verify_password(hash_password(form_data.password), user['hashed_password']):
        raise HTTPException(status_code = 400, detail = "Invalid credentials")
    
    access_token_expires = timedelta(minutes=30)
    
    # Включаем роль пользователя в полезную нагрузку токена
    access_token = create_access_token(
        data = {"sub": user['username'], "is_admin": user['is_admin']}, 
        expires_delta = access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Загружаем файл
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.filename == '':
        raise HTTPException(status_code = 400, detail = "File has not name")

    # Сохраняем файл в GridFS
    try:
        # Открываем поток для записи в GridFS
        async with fs.open_upload_stream(file.filename) as grid_in:
            while content := await file.read(1024):  # Читаем файл порциями по 1024 байта
                await grid_in.write(content)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    return {"message": "File uploaded successfully", "filename": file.filename}

# Загружаем фоновый трафик
@app.post("/background/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.filename == '':
        raise HTTPException(status_code = 400, detail = "File has not name")

    # Сохраняем файл в GridFS
    try:
        # Открываем поток для записи в GridFS
        async with fsb.open_upload_stream(file.filename) as grid_in:
            while content := await file.read(1024):  # Читаем файл порциями по 1024 байта
                await grid_in.write(content)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    return {"message": "File uploaded successfully", "filename": file.filename}

# Загружаем файл атаки
@app.post("/attack/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.filename == '':
        raise HTTPException(status_code = 400, detail = "File has not name")

    # Сохраняем файл в GridFS
    try:
        # Открываем поток для записи в GridFS
        async with fsa.open_upload_stream(file.filename) as grid_in:
            while content := await file.read(1024):  # Читаем файл порциями по 1024 байта
                await grid_in.write(content)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    return {"message": "File uploaded successfully", "filename": file.filename}

# Получаем файл
@app.get("/file/{filename}")
async def get_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fs.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    try:             
        # Возвращаем файл с правильным именем
        return StreamingResponse(file_generator(grid_out), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# Получаем список файлов
@app.get("/files")
async def list_files():
    # Получаем курсор для всех файлов в GridFS
    cursor = fs.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    
    return {"files": file_list}

# Получаем список файлов атак
@app.get("/attack")
async def list_files():
    # Получаем курсор для всех файлов в GridFS
    cursor = fsa.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    
    return {"files": file_list}

# Получаем выбранный файл атаки
@app.get("/attack/{filename}")
async def file_info(filename: str):
    # Получаем курсор для всех файлов в GridFS
    cursor = fsa.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_info = []
    async for file in cursor:
        if file.filename == filename:
            file_info.append({
                "filename": file.filename,
                "length": file.length,
                "upload_date": file.upload_date,
            })
    
    return {"file": file_info}

# Модифицируем файл атаки
@app.post("/modification/{filename}")
async def file_modification(filename: str, ip_forward: str, ip_victim: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fs.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    # Создаем временный файл для сохранения содержимого
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            # Читаем данные из GridFS и записываем их во временный файл
            while True:
                chunk = await grid_out.read(1024)  # Читаем порциями по 1024 байта
                if not chunk:
                    break
                temp_file.write(chunk)

            temp_file_path = temp_file.name  # Сохраняем имя временного файла

        except Exception as e:
            logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal Server Error")

    # Реализуем изменение IP
    try:
        packets = scapy.rdpcap(temp_file_path)  # Читаем пакеты из временного файла
        for packet in packets:
            if packet.haslayer(scapy.IP):
                packet["IP"].src = ip_forward
                packet["IP"].dst = ip_victim
                del packet["IP"].len  # Удаляем длину IP (будет пересчитана)
                del packet["IP"].chksum  # Удаляем контрольную сумму (будет пересчитана)

        # Создаем новый временный файл для сохранения измененных пакетов
        modified_temp_file_path = tempfile.mktemp(suffix=".pcapng")
        scapy.wrpcap(modified_temp_file_path, packets)  # Сохраняем измененные пакеты в новый файл
        new_filename = rename_file(filename)
   
        # Загружаем измененный файл в GridFS
        with open(modified_temp_file_path, 'rb') as f:
            await fsadmin.upload_from_stream(new_filename, f)
            
        # Загружаем измененный файл в GridFS
        with open(modified_temp_file_path, 'rb') as f:
            await fsuser.upload_from_stream(new_filename, f)

    except Exception as e:
        logger.error(f"Ошибка при обработке пакетов: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    finally:
        # Удаляем временные файлы после завершения обработки запроса
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if os.path.exists(modified_temp_file_path):
            os.remove(modified_temp_file_path)

    return {"message": f"File '{filename}' modified and uploaded successfully."}

# Получаем список файлов фонового трафика
@app.get("/background")
async def list_files():
    # Получаем курсор для всех файлов в GridFS
    cursor = fsb.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    
    return {"files": file_list}

# Получаем список файлов админа
@app.get("/adminm")
async def list_files():
    # Получаем курсор для всех файлов в GridFS
    cursor = fsadmin.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    
    return {"files": file_list}

# Получаем список файлов
@app.get("/userm")
async def list_files():
    # Получаем курсор для всех файлов в GridFS
    cursor = fsuser.find()
    
    # Создаем список файлов, извлекая необходимые поля
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    
    return {"files": file_list}

# Удаляем файл
@app.delete("/file/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fs.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fs.delete(grid_out._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

# Удаляем файл атаки
@app.delete("/attack/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsa.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fsa.delete(grid_out._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

# Удаляем файл фонового трафика
@app.delete("/background/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsb.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fsb.delete(grid_out._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

# Запуск сервера (это можно сделать через командную строку)
# uvicorn app:main --reload