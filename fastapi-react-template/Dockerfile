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
    && apt-get clean
# Устанавливаем зависимости React
WORKDIR /ui
RUN npm install -g create-react-app
# Устанавливаем зависимости FastAPI
WORKDIR /app
RUN python3 -m venv /venv
ADD ./app/app/requirements.txt /app/requirements.txt
RUN source /venv/bin/activate && pip3 install --no-cache-dir -r /app/requirements.txt
# Копируем код
ADD ./develop.sh /opt
# Открываем порты для FastAPI и React
EXPOSE 8000 3000
# Команда для запуска приложения FastAPI и сервера React
CMD ["/opt/develop.sh"]
