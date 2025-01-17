from pymongo import MongoClient
import pprint
from pylibpcap import wpcap
from pylibpcap import rpcap
#import json
import gridfs
import os

client = MongoClient("localhost", 27017)


# Получение коллекций

db = client["test_gridfs"]
users = db.get_collection("users")
docs = db.get_collection("docs")
fs = gridfs.GridFS(db)

def upload_file(file_path):
    # Проверка существования файла
    if not os.path.isfile(file_path):
        print(f"Файл {file_path} не найден.")
        return

    # Получаем имя файла
    filename = os.path.basename(file_path)

    # Загружаем файл в GridFS
    with open(file_path, 'rb') as file:
        fs.put(file, filename=filename)
    
    print(f"Файл '{filename}' успешно загружен в GridFS.")

# Вывести содержимое БД
def list_files():
    # Получаем все файлы из GridFS
    files = fs.find()
    
    # Выводим информацию о каждом файле
    for file in files:
        print(f"Имя файла: {file.filename}, Размер: {file.length} байт, Дата загрузки: {file.upload_date}")

def delete_file(file_path):
    # Проверка существования файла
    if not os.path.isfile(file_path):
        print(f"Файл {file_path} не найден.")
        return

    # Получаем имя файла
    filename = os.path.basename(file_path)

    file_info = fs.find_one({'filename': filename})
    
    if file_info is None:
        print(f"Файл с именем '{filename}' не найден.")
        return
    
    # Удаляем файл по его ID
    fs.delete(file_info._id)
    print(f"Файл '{filename}' успешно удален.")

# # Укажите путь к директории
# directory_path = os.getcwd()

# # Получаем список файлов
# files = os.listdir(directory_path)

# # Фильтруем файлы по расширению
# desired_extension = '.pcapng'  # Замените на нужное расширение
# filtered_files = [file for file in files if file.endswith(desired_extension)]

# # Добавляем отфильтрованные файлы
# for file in filtered_files:
#     upload_file(file)

# Добавление файла

# A = []
# for len, t, pkt in rpcap("dump_http_ip.pcapng"):
#     print(t)
#     A.append(pkt)

# doc = {
#     "name": "dump_http_ip",
#     "data": []
# }
# doc["data"] = A

# docs.insert_one(doc)


# Изменение имени

# docs.replace_one({"name": '1'}, {"name": 'tcp'})


# Изменение содержимого файла

#docs.update_one({"name": 'tcp'}, {"$set": {"data": [b'\x00\xff$c\xf2\x1c\x00\xff#c\xf2\x1c\x08\x00E\x00\x004mj@\x00\x80\x060c\n\x08\x00\x02W\xfa\xfa\xf2\xc4\xa4\x00P0\xc4\xcf`\x00\x00\x00\x00\x80\x02 \x00-\x00\x00\x00\x02\x04\x05\xb4\x01\x03\x03\x08\x01\x01\x04\x02', b'\x00\xff#c\xf2\x1c\x00\xff$c\xf2\x1c\x08\x00E \x004\xa5\xbf\x00\x00;\x06|\xeeW\xfa\xfa\xf2\n\x08\x00\x02\x00P\xc4\xa4\xd9\xc2G\x8a0\xc4\xcfa\x80\x12\xa5<\x86\xcd\x00\x00\x02\x04\x05L\x01\x01\x04\x02\x01\x03\x03\x08', b'\x00\xff$c\xf2\x1c\x00\xff#c\xf2\x1c\x08\x00E\x00\x00(ml@\x00\x80\x060m\n\x08\x00\x02W\xfa\xfa\xf2\xc4\xa4\x00P0\xc4\xcfa\xd9\xc2G\x8bP\x10\x01\x03kr\x00\x00', b'\x00\xff$c\xf2\x1c\x00\xff#c\xf2\x1c\x08\x00E\x00\x01\x82mm@\x00\x80\x06/\x12\n\x08\x00\x02W\xfa\xfa\xf2\xc4\xa4\x00P0\xc4\xcfa\xd9\xc2G\x8bP\x18\x01\x03_\x99\x00\x00GET / HTTP/1.1\r\nHost: ya.ru\r\nUser-Agent: Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r\nAccept-Language: ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3\r\nAccept-Encoding: gzip, deflate\r\nConnection: keep-alive\r\nUpgrade-Insecure-Requests: 1\r\n\r\n', b'\x00\xff#c\xf2\x1c\x00\xff$c\xf2\x1c\x08\x00E \x00(\xa5\xcc\x00\x00;\x06|\xedW\xfa\xfa\xf2\n\x08\x00\x02\x00P\xc4\xa4\xd9\xc2G\x8b0\xc4\xd0\xbbP\x10\x00\xa4jw\x00\x00\x00\x00\x00\x00\x00\x00', b'\x00\xff#c\xf2\x1c\x00\xff$c\xf2\x1c\x08\x00E \x05t\xa5\xcd\x00\x00;\x06w\xa0W\xfa\xfa\xf2\n\x08\x00\x02\x00P\xc4\xa4\xd9\xc2G\x8b0\xc4\xd0\xbbP\x10\x00\xa6\x82\x11\x00\x00HTTP/1.1 301 Moved permanently\r\nAccept-CH: Sec-CH-UA-Bitness, Sec-CH-UA-Arch, Sec-CH-UA-Full-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Platform, Sec-CH-UA, UA-Bitness, UA-Arch, UA-Full-Version, UA-Mobile, UA-Model, UA-Platform-Version, UA-Platform, UA\r\nCache-Control: max-age=1209600,private\r\nContent-Encoding: gzip\r\nDate: Tue, 07 Feb 2023 12:49:34 GMT\r\nLocation: https://ya.ru/\r\nNEL: {"report_to": "network-errors", "max_age": 100, "success_fraction": 0.001, "failure_fraction": 0.1}\r\nP3P: policyref="/w3c/p3p.xml", CP="NON DSP ADM DEV PSD IVDo OUR IND STP PHY PRE NAV UNI"\r\nPortal: Home\r\nReport-To: { "group": "network-errors", "max_age": 100, "endpoints": [{"url": "https://dr.yandex.net/nel", "priority": 1}, {"url": "https://dr2.yandex.net/nel", "priority": 2}]}\r\nTransfer-Encoding: chunked\r\nX-Content-Type-Options: nosniff\r\nX-Yandex-Req-Id: 1675774174183045-7109949998395985773-vla1-0246-vla-l7-balancer-8080-BAL-3713\r\nset-cookie: is_gdpr=0; Path=/; Domain=.ya.ru; Expires=Thu, 06 Feb 2025 12:49:34 GMT\r\nset-cookie: is_gdpr_b=CLqNMxCnpQEoAg==; Path=/; Domain=.ya.ru; Expires=Thu, 06 Feb 2025 12:49:34 GMT\r\nset-cookie: _yasc=rgKBJNbgJ6/1lqK1Fwrjn3DQ2cGhIfb+Fd7VhD2ZXIvAGE74NDrt7gR7AF4=; domain=.ya.ru; path=/; expires=Fri, 04-Feb-2033 12:49:34 GMT; secure\r\n\r\nF\r\n\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\x03\x00\x00\x00\xff\xff\r\nA\r\n', b'\x00\xff#c\xf2\x1c\x00\xff$c\xf2\x1c\x08\x00E \x009\xa5\xce\x00\x00;\x06|\xdaW\xfa\xfa\xf2\n\x08\x00\x02\x00P\xc4\xa4\xd9\xc2L\xd70\xc4\xd0\xbbP\x18\x00\xa6\x10\xec\x00\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\r\n0\r\n\r\n', b'\x00\xff$c\xf2\x1c\x00\xff#c\xf2\x1c\x08\x00E\x00\x00(mo@\x00\x80\x060j\n\x08\x00\x02W\xfa\xfa\xf2\xc4\xa4\x00P0\xc4\xd0\xbb\xd9\xc2L\xe8P\x10\x01\x03d\xbb\x00\x00']}})

# Извлечение 

# doc = docs.find_one({"name": 'udp'})

# doc_data = doc["data"]
# for i in range(len(doc_data)):
#     wpcap(doc_data[i], "new_udp.pcapng")


# Удаление файла

# docs.delete_one({"name": "icmp"})

# Вывод бд

# for doc in docs.find():
#     pprint.pprint(doc)

