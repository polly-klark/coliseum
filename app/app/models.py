from pydantic import BaseModel
import gostcrypto, os
from scapy.all import PcapReader, IP

class PcapAnalyzer:
    def __init__(self, filename):
        self.filename = filename
        self.ips = set()
        self._process_packets()

    def _process_packets(self):
        """Обработка пакетов и сбор IP-адресов"""
        with PcapReader(self.filename) as reader:
            for packet in reader:
                if packet.haslayer(IP):
                    self.ips.add(packet[IP].src)
                    self.ips.add(packet[IP].dst)

    def get_sorted_ips(self):
        """Возвращает отсортированный список IP-адресов"""
        return sorted(self.ips)

# Модель пользователя
class User(BaseModel):
    username: str
    hashed_password: str
    role: str  # Добавляем поле для роли

class IpPair(BaseModel):
    key: str
    ip: str

class ModificationRequest(BaseModel):
     items: list[IpPair]

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

