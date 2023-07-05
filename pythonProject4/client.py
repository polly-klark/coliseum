from socket import *
#from scapy.all import *
import json
import re
from PyQt5 import uic
from PyQt5.QtWidgets import QApplication
from PyQt5.QtWidgets import QMessageBox

Form, Window = uic.loadUiType("untitled.ui")

app = QApplication([])
window = Window()
form = Form()
form.setupUi(window)
window.show()

class Client:
    def __init__(self, ip, port):
        self.client = socket(AF_INET, SOCK_STREAM)
        self.client.connect(
            (ip, port)
        )
    def connect(self):
        try:
            msg = self.client.recv(1024).decode('utf-8')
        except Exception as e:
            print(f'ERROR: {str(e)}')
            exit()

        # if msg == 'YOU ARE CONNECTED!':
        #     self.listen('')
        # else:
        #     exit()

    def sender(self, text):
        self.client.send(text.encode('utf-8'))
        while self.client.recv(1024).decode('utf-8') != 'got':
            self.client.send(text.encode('utf-8'))

    def data_receiver(self):
        return self.client.recv(1024).decode("utf-8")

    # def listen(self,req):
    #     is_work = True
    #     while is_work:
    #         if req:
    #             if req == 'disconnect':
    #                 self.sender(req)
    #                 print(self.client.recv(1024).decode('utf-8'))
    #
    #             else:
    #                 self.sender(req)
    #                 data = json.loads(
    #                     self.client.recv(1024).decode('utf-8')
    #                 )
    #
    #                 if data['answer']:
    #                     print(f'SERVER ANSWER:\n\t{data["answer"]}')
    #                 elif data['error']:
    #                     print(f'SERVER ERROR:\n\t{data["error"]}')

#Client(input('Type server ip: '), 1111).connect()

def podkl(_str):
    r = r"\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}"
    ip = form.lineEdit.text()
    if re.match(r, ip):
        global cl
        cl = Client(ip, 1111)
        cl.connect()
        form.label_3.setText('Статус: подключено')
    else:
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Неверный формат IP адреса!")

        x = msg.exec_()

def otkl(_str):
    obj = dict()
    obj["type"] = "disconnect"
    req = json.dumps(obj)
    cl.sender(req)
    form.label_3.setText('Статус: не подключено')

def zapros(_str):
    if form.radioButton.isChecked() or form.radioButton_2.isChecked() or form.radioButton_3.isChecked():
        obj = dict()
        obj["type"] = "request"
        param = dict()
        if form.radioButton.isChecked():
            param["dir"] = "background"
        elif form.radioButton_2.isChecked():
            param["dir"] = "attack"
        elif form.radioButton_3.isChecked():
            param["dir"] = "modified"
        obj["param"] = param.copy()
        req = json.dumps(obj)
        cl.sender(req)

        is_work = True
        while is_work:
            try:
                data = dict(json.loads(cl.data_receiver()))
                if data["type"] == "request_answer":
                    form.listWidget.clear()
                    for i in data["param"]["files"]:
                        form.listWidget.addItem(i)
                    is_work = False
            except Exception as e:
                data = ''
                is_work = False

def udalit(_str):
    if form.listWidget.currentItem() and form.radioButton_3.isChecked():
        obj = dict()
        obj["type"] = "delete"
        param = dict()
        if form.radioButton.isChecked():
            param["dir"] = "background"
        elif form.radioButton_2.isChecked():
            param["dir"] = "attack"
        elif form.radioButton_3.isChecked():
            param["dir"] = "modified"
        param["file"] = form.listWidget.currentItem().text()
        obj["param"] = param.copy()
        req = json.dumps(obj)
        cl.sender(req)

        is_work = True
        while is_work:
            try:
                data = dict(json.loads(cl.data_receiver()))
                if data["type"] == "delete_answer":
                    form.listWidget.clear()
                    for i in data["param"]["files"]:
                        form.listWidget.addItem(i)
                    is_work = False
            except Exception as e:
                data = ''
                is_work = False

    elif form.listWidget.currentItem() and form.radioButton.isChecked():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Нельзя удалить файлы фонового трафика!")

        x = msg.exec_()

    elif form.listWidget.currentItem() and form.radioButton_2.isChecked():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Нельзя удалить файлы стандартных атак!")

        x = msg.exec_()

    elif not form.listWidget.currentItem():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Выберите файл!")

        x = msg.exec_()

def modif(_str):
    r = r"\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}"
    if form.listWidget.currentItem() and form.radioButton_2.isChecked() and re.match(r, form.lineEdit_2.text()) and re.match(r, form.lineEdit_3.text()):
        obj = dict()
        obj["type"] = "modify"
        param = dict()
        param["ip_forward"] = form.lineEdit_2.text()
        param["ip_victim"] = form.lineEdit_3.text()
        param["file"] = form.listWidget.currentItem().text()
        obj["param"] = param.copy()
        req = json.dumps(obj)
        cl.sender(req)

        is_work = True
        while is_work:
            try:
                data = dict(json.loads(cl.data_receiver()))
                if data["type"] == "modify_answer":
                    if data["param"]["ans"] == "OK":
                        msg = QMessageBox()
                        msg.setWindowTitle("Успех!")
                        msg.setText("Атака успешно модифицирована! Вы можете увидеть её в директории \"модифицированные атаки\"")

                        x = msg.exec_()

                    elif data["param"]["ans"] == "ERROR":
                        msg = QMessageBox()
                        msg.setWindowTitle("Неудача!")
                        msg.setText(
                            "Атака не была модифицирована! Попробуйте ещё раз!")

                        x = msg.exec_()
                is_work = False
            except Exception as e:
                data = ''
                is_work = False

    elif form.listWidget.currentItem() and form.radioButton.isChecked():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Нельзя редактировать файлы фонового трафика!")

        x = msg.exec_()

    elif form.listWidget.currentItem() and form.radioButton_3.isChecked():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Нельзя редактировать модифицированные атаки!")

        x = msg.exec_()

    elif form.listWidget.currentItem() and form.radioButton_2.isChecked() and (not re.match(r, form.lineEdit_2.text()) or not re.match(r, form.lineEdit_3.text())):
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Неверный формат IP адреса!")

        x = msg.exec_()

    elif not form.listWidget.currentItem():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Выберите файл!")

        x = msg.exec_()

def zapusk(_str):
    if form.listWidget.currentItem() and (form.radioButton.isChecked() or form.radioButton_3.isChecked()):
        obj = dict()
        obj["type"] = "play"
        param = dict()
        if form.radioButton.isChecked():
            param["dir"] = "background"
        elif form.radioButton_3.isChecked():
            param["dir"] = "modified"
        param["file"] = form.listWidget.currentItem().text()
        obj["param"] = param.copy()
        req = json.dumps(obj)
        cl.sender(req)

        is_work = True
        while is_work:
            try:
                data = dict(json.loads(cl.data_receiver()))
                if data["type"] == "play_answer":
                    if data["param"]["status"] == "RUN":
                        msg = QMessageBox()
                        msg.setWindowTitle("Успех!")
                        msg.setText("Трафик запущен!")

                        x = msg.exec_()
                    else:
                        msg = QMessageBox()
                        msg.setWindowTitle("Ошибка!")
                        msg.setText("Трафик не запущен! Попробуйте ещё раз!")

                        x = msg.exec_()
                    is_work = False
            except Exception as e:
                data = ''
                is_work = False

    elif form.listWidget.currentItem() and form.radioButton_2.isChecked():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Нельзя запустить стандартную атаку!")

        x = msg.exec_()

    elif not form.listWidget.currentItem():
        msg = QMessageBox()
        msg.setWindowTitle("Ошибка!")
        msg.setText("Выберите файл!")

        x = msg.exec_()

def ostanov(_str):
    obj = dict()
    obj["type"] = "stop"
    req = json.dumps(obj)
    cl.sender(req)

    is_work = True
    while is_work:
        try:
            data = dict(json.loads(cl.data_receiver()))
            if data["type"] == "stop_answer":
                if data["param"]["ans"] == "STOPPED":
                    msg = QMessageBox()
                    msg.setWindowTitle("Успех!")
                    msg.setText(
                        "Атака успешно остановлена!")

                    x = msg.exec_()

                elif data["param"]["ans"] == "ERROR":
                    msg = QMessageBox()
                    msg.setWindowTitle("Неудача!")
                    msg.setText(
                        "Атака не была остановлена! Попробуйте ещё раз!")

                    x = msg.exec_()
            is_work = False
        except Exception as e:
            data = ''
            is_work = False

form.pushButton.clicked.connect(lambda: podkl("string"))
form.pushButton_7.clicked.connect(lambda: otkl("string"))
form.pushButton_2.clicked.connect(lambda: zapros("string"))
form.pushButton_3.clicked.connect(lambda: udalit("string"))
form.pushButton_4.clicked.connect(lambda: modif("string"))
form.pushButton_5.clicked.connect(lambda: zapusk("string"))
form.pushButton_6.clicked.connect(lambda: ostanov("string"))

app.exec_()