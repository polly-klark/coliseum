import os
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
import gostcrypto, jwt, secrets
from datetime import datetime, timezone

# Настройки приложения
app = FastAPI()

# Подключение к MongoDB
client = AsyncIOMotorClient('mongodb://localhost:27017/')
auth_db = client['test']
db = client['test_gridfs']
# print(isinstance(db, database.Database))  # Должно вернуть True
fs = AsyncIOMotorGridFSBucket(db)

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
    fs.put(file.file, filename = file.filename)
    
    return {"message": "File is loaded", "filename": file.filename}

# Получаем файл
@app.get("/file/{filename}")
async def get_file(filename: str):
    file = fs.find_one({'filename': filename})
    
    if file is None:
        raise HTTPException(status_code = 404, detail = "File not found")
    
    # Возвращаем файл с правильным именем
    return StreamingResponse(file, media_type = 'application/octet-stream', headers = {"Content-Disposition": f"attachment; filename={file.filename}"})

# Получаем список файлов
@app.get("/files")
async def list_files():
    files = fs.find()
    file_list = [{"filename": file.filename, "length": file.length, "upload_date": file.upload_date} for file in files]
    
    return {"files": file_list}

# Удаляем файл
@app.delete("/file/{filename}")
async def delete_file(filename: str):
    # Находим файл по имени
    file_info = fs.find_one({'filename': filename})
    
    if file_info is None:
        raise HTTPException(status_code = 404, detail="File not found")
    
    # Удаляем файл по его ID
    fs.delete(file_info._id)
    
    return {"message": f"File '{filename}' is deleted successfully."}

# Запуск сервера (это можно сделать через командную строку)
# uvicorn app:main --reload