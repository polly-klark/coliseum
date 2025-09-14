from pydantic import BaseModel
import gostcrypto, os
from scapy.all import PcapReader, IP
from typing import List, Optional

import scapy.all as scapy

class PcapAnalyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.packets = scapy.rdpcap(file_path)

    def get_sorted_ips(self):
        ips = set()
        for packet in self.packets:
            if packet.haslayer(scapy.IP):
                ips.add(packet[scapy.IP].src)
                ips.add(packet[scapy.IP].dst)
        return sorted(ips)

    def get_sorted_tcp_ports(self):
        tcp_ports = set()
        for packet in self.packets:
            if packet.haslayer(scapy.TCP):
                tcp_ports.add(packet[scapy.TCP].sport)
                tcp_ports.add(packet[scapy.TCP].dport)
        return sorted(tcp_ports)

    def get_sorted_udp_ports(self):
        udp_ports = set()
        for packet in self.packets:
            if packet.haslayer(scapy.UDP):
                udp_ports.add(packet[scapy.UDP].sport)
                udp_ports.add(packet[scapy.UDP].dport)
        return sorted(udp_ports)

# Модель пользователя
class User(BaseModel):
    username: str
    hashed_password: str
    role: str  # Добавляем поле для роли

class IpPair(BaseModel):
    key: str
    ip: str

class TcpPortPair(BaseModel):
    key: str
    port: int

class UdpPortPair(BaseModel):
    key: str
    port: int

class ModificationRequest(BaseModel):
    ip_items: Optional[List[IpPair]] = None
    tcp_port_items: Optional[List[TcpPortPair]] = None
    udp_port_items: Optional[List[UdpPortPair]] = None
    # Можно добавлять другие списки замены по мере необходимости

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

