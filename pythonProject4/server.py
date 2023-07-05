import os
from socket import *
import scapy.all as scapy
import subprocess
import sqlite3 as sql
import json
from subprocess import check_output
import signal

def get_pid(name):
    return check_output(["pidof",name])

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
                    # self.sender(user, 'YOU ARE DISCONNECTED!')
                    user.close()
                    print(f'DISCONNECTED: \n\tIP: {addr[0]}')
                    is_work = False

                elif msg["type"] == "request":
                    if msg["param"]["dir"] == "background":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/background')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                    elif msg["param"]["dir"] == "attack":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/attack')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                    elif msg["param"]["dir"] == "modified":
                        ans = dict()
                        ans["type"] = "request_answer"
                        param = dict()
                        path = os.getcwd()
                        files = os.listdir(path + '/modified')
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                elif msg["type"] == "delete":
                    if msg["param"]["dir"] == "background":
                        ans = dict()
                        ans["type"] = "delete_answer"
                        param = dict()
                        path = os.getcwd()
                        dir = path + '/background'
                        os.remove(dir + '/' + msg["param"]["file"])
                        files = os.listdir(dir)
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                    elif msg["param"]["dir"] == "attack":
                        ans = dict()
                        ans["type"] = "delete_answer"
                        param = dict()
                        path = os.getcwd()
                        dir = path + '/attack'
                        os.remove(dir + '/' + msg["param"]["file"])
                        files = os.listdir(dir)
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                    elif msg["param"]["dir"] == "modified":
                        ans = dict()
                        ans["type"] = "delete_answer"
                        param = dict()
                        path = os.getcwd()
                        dir = path + '/modified'
                        os.remove(dir + '/' + msg["param"]["file"])
                        files = os.listdir(dir)
                        param["files"] = files.copy()
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                elif msg["type"] == "modify":
                    ip_forward = msg["param"]["ip_forward"]
                    ip_victim = msg["param"]["ip_victim"]
                    file = msg["param"]["file"]
                    path = os.getcwd() + '/attack/' + file
                    a = scapy.rdpcap(path)
                    A = []
                    for p in a:
                        p["IP"].src = ip_forward
                        p["IP"].dst = ip_victim
                        #p.show()
                        del p["IP"].len
                        del p["IP"].chksum
                        p = scapy.Ether(p.build())
                        #p.show()
                        A.append(p)
                    old_path = os.getcwd()
                    new_path = os.getcwd() + '/modified'
                    os.chdir(new_path)
                    new_name = file[:-7] + '_' + ip_forward.replace('.', '_') + '_to_' + ip_victim.replace('.', '_')
                    scapy.wrpcapng(new_name + '.pcapng', A)
                    os.chdir(old_path)
                    ans = dict()
                    ans["type"] = "modify_answer"
                    B = os.listdir(new_path)
                    param = dict()
                    if new_name + '.pcapng' in B:
                        param["ans"] = "OK"
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)
                    else:
                        param["ans"] = "ERROR"
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                elif msg["type"] == "play":
                    if msg["param"]["dir"] == "background":
                        ans = dict()
                        ans["type"] = "play_answer"
                        param = dict()
                        path = os.getcwd()
                        dir = path + '/background'
                        os.chdir(dir)
                        process = subprocess.run(['tcpreplay', '-i', 'ens33', msg["param"]["file"]])
                        os.chdir(path)

                    elif msg["param"]["dir"] == "modified":
                        ans = dict()
                        ans["type"] = "play_answer"
                        param = dict()
                        path = os.getcwd()
                        dir = path + '/modified'
                        os.chdir(dir)
                        process = subprocess.run(['tcpreplay', '-i', 'ens33', msg["param"]["file"]])
                        os.chdir(path)
                        if get_pid("tcpreplay"):
                            param["status"] = "RUN"
                        else:
                            param["status"] = "ERROR"
                        ans["param"] = param.copy()
                        s = json.dumps(ans)
                        self.sender(user, s)

                elif msg["type"] == "stop":
                    ans = dict()
                    ans["type"] = "stop_answer"
                    param = dict()
                    pid = get_pid("tcpreplay")
                    os.kill(pid, signal.SIGTERM)
                    n = get_pid("tcpreplay")
                    if n:
                        param["status"] = "ERROR"
                    else:
                        param["status"] = "STOPPED"
                    ans["param"] = param.copy()
                    s = json.dumps(ans)
                    self.sender(user, s)

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



                data = b''
                msg = ''

            else:
                print('DISCONNECTED!')
                is_work = False

Server('127.0.0.1', 1111, 'data.db').start_server()