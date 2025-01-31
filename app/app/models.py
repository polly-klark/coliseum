from pydantic import BaseModel
import gostcrypto, os

# Модель пользователя
class User(BaseModel):
    username: str
    hashed_password: str
    role: str  # Добавляем поле для роли

def hash_password(password: str) -> str:
    password = password.encode('cp1251')
    return gostcrypto.gosthash.new('streebog256', data=password).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password

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