from pydantic import BaseModel
import gostcrypto

# Модель пользователя
class User(BaseModel):
    username: str
    hashed_password: str
    role: str  # Добавляем поле для роли

# # Настройки для хеширования паролей
# pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    password = password.encode('cp1251')
    return gostcrypto.gosthash.new('streebog256', data=password).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password