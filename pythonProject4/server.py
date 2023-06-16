import os
from socket import *
#from scapy.all import *
import sqlite3 as sql
import json

class Server:
    def __init__(self, ip, port, base_name):
        print(f'SERVER IP: {ip}\nSERVER PORT: {port}\n')
        self.data_name = base_name
        self.server = socket(AF_INET, SOCK_STREAM)
        self.server.bind(
            (ip, port)
        )
        self.server.listen(25)

    def sender(self, user, text):
        user.send(text.encode('utf-8'))

    def start_server(self):
        while True:
            user, addr = self.server.accept()
            print(f'CONNECTED:\n\tIP: {addr[0]}\n\tPORT: {addr[1]}')
            self.listen(user, addr)

    def listen(self, user, addr):
        self.sender(user, 'YOU ARE CONNECTED!')
        is_work = True

        while is_work:
            try:
                data = user.recv(1024)
                self.sender(user, 'got')
            except Exception as e:
                data = ''
                is_work = False

            if len(data) > 0:

                msg = dict(json.loads(data.decode('utf-8')))

                if msg["type"] == "disconnect":
                    self.sender(user, 'YOU ARE DISCONNECTED!')
                    user.close()
                    print(f'DISCONNECTED: \n\tIP: {addr[0]}')
                    is_work = False
                elif msg["type"] == "request":
                    if msg["param"]["file"] == "background":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/background')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)

                    elif msg["param"]["file"] == "attack":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/attack')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)

                    elif msg["param"]["file"] == "modified":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/modified')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)

                    # con = sql.connect(self.data_name)
                    # cur = con.cursor()
                    #
                    # try:
                    #     answer = [x for x in cur.execute(msg)]
                    #     error = ''
                    # except Exception as e:
                    #     error = str(e)
                    #     answer = ''
                    #
                    # con.commit()
                    # cur.close()
                    # con.close()

                    # ans = json.dumps(
                    #     { 'answer' : answer, 'error' : error }
                    # )

                    self.sender(user, s)

                data = b''
                msg = ''

            else:
                print('DISCONNECTED!')
                is_work = False

Server('192.168.119.1', 1111, 'data.db').start_server()