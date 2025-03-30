from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import secrets, logging, tempfile, os, requests, httpx
from jose import JWTError, jwt 
from datetime import datetime, timezone, timedelta
import scapy.all as scapy
from models import User, hash_password, verify_password, rename_file, file_generator, ModificationRequest, PcapAnalyzer
from fastapi.middleware.cors import CORSMiddleware

# Настройка логирования
logging.basicConfig(filename='app.log', level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройки приложения
app = FastAPI()

# Укажите разрешенные источники
# origins = [
#     "http://localhost:3000",  # ваш React фронтенд
#     "http://127.0.0.1:3000",
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

# JWT настройки
SECRET_KEY = secrets.token_hex(32)  # Генерирует 64-значный шестнадцатеричный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    user_data = await auth_db.users.find_one({"username": username})

    if user_data is None:
        raise credentials_exception
    
    # Преобразуем данные из базы в экземпляр модели User
    try:
        user = User(**user_data)  # Создаем объект User из словаря
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error parsing user data")
          
    return user

# Ваши функции для получения файлов
async def list_files_admin():
    cursor = fsadmin.find()
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    return file_list

async def list_files_user():
    cursor = fsuser.find()
    file_list = []
    async for file in cursor:
        file_list.append({
            "filename": file.filename,
            "length": file.length,
            "upload_date": file.upload_date,
        })
    return file_list

def role_checker(required_role: str):
    async def role_checker_inner(user: User = Depends(get_current_user)):
        if user.role != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")
        return user
    return role_checker_inner

# Получение имени пользователя
@app.get("/user")
async def get_user(user: User = Depends(get_current_user)):
    return user.username

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
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Включаем роль пользователя в полезную нагрузку токена
    access_token = create_access_token(
        data = {"sub": user['username']}, 
        expires_delta = access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/admin")
async def read_admin_data(current_user: User = Depends(role_checker("admin"))):
    return {"message": "This is admin data."}

@app.get("/user")
async def read_user_data(current_user: User = Depends(role_checker("user"))):
    return {"message": "This is user data."}

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
    
    return file_list

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

@app.get("/modification_list/{filename}")
async def ip_list(filename: str):
    try:
        grid_out = await fsa.open_download_stream_by_name(filename)
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
    analyzer = PcapAnalyzer(temp_file_path)
    input_array = analyzer.ips
    result = [{"key": str(i+1), "ip": ip} for i, ip in enumerate(input_array)]
    return result

# Модифицируем файл атаки
@app.post("/modification/{filename}")
async def file_modification(filename: str, request_data: ModificationRequest):
    changed_ips = request_data.items
    logger.info(f"Получены данные: filename: {filename}, items: {changed_ips}")
    # Открываем поток для чтения файла из GridFS по имени
    # try:
    #     grid_out = await fsa.open_download_stream_by_name(filename)
    # except Exception as e:
    #     logger.error(f"Ошибка при получении файла: {str(e)}")
    #     raise HTTPException(status_code=404, detail="File not found")

    # # Создаем временный файл для сохранения содержимого
    # with tempfile.NamedTemporaryFile(delete=False) as temp_file:
    #     try:
    #         # Читаем данные из GridFS и записываем их во временный файл
    #         while True:
    #             chunk = await grid_out.read(1024)  # Читаем порциями по 1024 байта
    #             if not chunk:
    #                 break
    #             temp_file.write(chunk)

    #         temp_file_path = temp_file.name  # Сохраняем имя временного файла

    #     except Exception as e:
    #         logger.error(f"Ошибка при записи файла во временный файл: {str(e)}")
    #         raise HTTPException(status_code=500, detail="Internal Server Error")

    # # Реализуем изменение IP
    # try:
    #     packets = scapy.rdpcap(temp_file_path)  # Читаем пакеты из временного файла
    #     for packet in packets:
    #         if packet.haslayer(scapy.IP):
    #             packet["IP"].src = ip_forward
    #             packet["IP"].dst = ip_victim
    #             del packet["IP"].len  # Удаляем длину IP (будет пересчитана)
    #             del packet["IP"].chksum  # Удаляем контрольную сумму (будет пересчитана)
    #             packet = scapy.Ether(packet.build())

    #     # Создаем новый временный файл для сохранения измененных пакетов
    #     modified_temp_file_path = tempfile.mktemp(suffix=".pcapng")
    #     scapy.wrpcap(modified_temp_file_path, packets)  # Сохраняем измененные пакеты в новый файл
    #     new_filename = rename_file(filename)
   
    #     # Загружаем измененный файл в GridFS
    #     with open(modified_temp_file_path, 'rb') as f:
    #         await fsadmin.upload_from_stream(new_filename, f)
            
    #     # Загружаем измененный файл в GridFS
    #     with open(modified_temp_file_path, 'rb') as f:
    #         await fsuser.upload_from_stream(new_filename, f)

    # except Exception as e:
    #     logger.error(f"Ошибка при обработке пакетов: {str(e)}")
    #     raise HTTPException(status_code=500, detail="Internal Server Error")

    # finally:
    #     # Удаляем временные файлы после завершения обработки запроса
    #     if os.path.exists(temp_file_path):
    #         os.remove(temp_file_path)
    #     if os.path.exists(modified_temp_file_path):
    #         os.remove(modified_temp_file_path)

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
    
    return file_list

# Получаем список файлов админа
@app.get("/admin")
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
@app.get("/user")
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

# Объединенная функция для получения файлов в зависимости от роли
@app.get("/modified", response_model=list)
async def get_files(user: User = Depends(get_current_user)):
    if user.role == "admin":
        return await list_files_admin()
    elif user.role == "user":
        return await list_files_user()
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not recognized")

# Удаляем файл
@app.delete("/file/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsuser.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fsuser.delete(grid_out._id)
    
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

@app.delete("/user/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsuser.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fsuser.delete(grid_out._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

@app.delete("/admin/{filename}")
async def delete_file(filename: str):
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsadmin.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Удаляем файл по его ID
    await fsadmin.delete(grid_out._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

# Прокси
@app.post("/play_attack/{filename}")
async def send_file(filename: str):
    logger.info(f"Передаю файл {filename} для запуска")
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsa.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    try:

        async def file_stream():
            async for chunk in file_generator(grid_out):
                yield chunk

        async with httpx.AsyncClient() as client:
            headers = {
            "filename": filename,
            }
            response = await client.post("http://192.168.42.129:9000/receive_file", content=file_stream(), headers=headers, timeout=None)          
        # return StreamingResponse(file_generator(grid_out), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        logger.error(f"Ошибка при передаче файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return response.text

@app.post("/play_background/{filename}")
async def send_file(filename: str):
    logger.info(f"Передаю файл {filename} для запуска")
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsb.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    try:

        async def file_stream():
            async for chunk in file_generator(grid_out):
                yield chunk

        async with httpx.AsyncClient() as client:
            headers = {
            "filename": filename,
            }
            response = await client.post("http://192.168.42.129:9000/receive_file", content=file_stream(), headers=headers, timeout=None)
            response.raise_for_status()  # Проверка статуса ответа
        # return StreamingResponse(file_generator(grid_out), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        logger.error(f"Ошибка при передаче файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return response.text

@app.post("/play_usermod/{filename}")
async def send_file(filename: str):
    logger.info(f"Передаю файл {filename} для запуска")
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsuser.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    try:

        async def file_stream():
            async for chunk in file_generator(grid_out):
                yield chunk

        async with httpx.AsyncClient() as client:
            headers = {
            "filename": filename,
            }
            response = await client.post("http://192.168.42.129:9000/receive_file", content=file_stream(), headers=headers, timeout=None)          
        # return StreamingResponse(file_generator(grid_out), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        logger.error(f"Ошибка при передаче файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return response.text

@app.post("/play_adminmod/{filename}")
async def send_file(filename: str):
    logger.info(f"Передаю файл {filename} для запуска")
    # Открываем поток для чтения файла из GridFS по имени
    try:
        grid_out = await fsadmin.open_download_stream_by_name(filename)
    except Exception as e:
        logger.error(f"Ошибка при получении файла: {str(e)}")
        raise HTTPException(status_code=404, detail="File not found")

    try:

        async def file_stream():
            async for chunk in file_generator(grid_out):
                yield chunk

        async with httpx.AsyncClient() as client:
            headers = {
            "filename": filename,
            }
            response = await client.post("http://192.168.42.129:9000/receive_file", content=file_stream(), headers=headers, timeout=None)          
        # return StreamingResponse(file_generator(grid_out), media_type='application/octet-stream', headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        logger.error(f"Ошибка при передаче файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return response.text
    
@app.post("/stop")
async def stop():
    async with httpx.AsyncClient() as client:
        response = await client.post("http://192.168.42.129:9000/stop", timeout=None)
    return response.text

# Запуск сервера (это можно сделать через командную строку)
# uvicorn app:main --reload