# Используем образ Ubuntu 24.04
FROM ubuntu:24.04
# Не используем взаимодействие с пользователем
ARG DEBIAN_FRONTEND=noninteractive
# Выбираем часовой пояс
ENV TZ=Europe/Moscow
# Выбираем интерпретатор
SHELL ["/bin/bash", "-c"]
# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    python3-venv \
    nodejs \
    npm \
    redis-server \
    libpcap-dev \ 
    && apt-get clean
# Устанавливаем зависимости FastAPI
WORKDIR /app
RUN python3 -m venv /venv
ADD ./app/app/requirements.txt /app/requirements.txt
RUN source /venv/bin/activate && pip3 install --no-cache-dir -r /app/requirements.txt
# Устанавливаем MongoDB
RUN apt update && apt -y upgrade && apt install -y gnupg curl
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
RUN apt update && apt install -y mongodb-org
# Запускаем MongoDB
# RUN mongod --fork --logpath /var/log/mongodb.log &
# ADD ./app/dump /dump
# RUN mongorestore /dump
# Устанавливаем зависимости React
WORKDIR /ui
RUN npm create vite ui && npm install axios react-router-dom && npm install && npm install antd --save 
WORKDIR /app
# Копируем код
ADD ./develop.sh /opt
# Открываем порты для FastAPI и React
EXPOSE 8000 3000 27017
# Команда для запуска приложения FastAPI и сервера React
CMD ["/opt/develop.sh"]
