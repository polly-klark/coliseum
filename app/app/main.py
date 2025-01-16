import re
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import storage.models as models, storage.schemas as schemas
from storage.database import engine, SessionLocal

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Создание таблиц в базе данных (если они еще не существуют)
models.Base.metadata.create_all(bind=engine)

@app.get("/api")
async def get():
    return {"message": "Hello, World!"}
