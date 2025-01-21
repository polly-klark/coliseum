#!/bin/bash

#Запускаем mongodb
mongod --fork --logpath /var/log/mongo/mongodb.log &
mongorestore /dump
#Запускаем бэкенд
source /venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info --reload &
#Запускаем redis
/etc/init.d/redis-server restart
#Запускаем celery
source /venv/bin/activate && watchmedo auto-restart --directory=/app --pattern=*.py --recursive -- celery -A tasks worker --loglevel=INFO &
#Устанавливаем модули React
npm --prefix /ui install
#Запускаем фронтенд
REACT_APP_API_URL="http://localhost:8000/api/" npm --prefix /ui start