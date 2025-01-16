from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/login")
def show_login():
    pass

@app.post("/login")
def login(name, passw):
    pass

@app.get("/attack")
def show_attack(limit: int = 10, offset: int = 0):
    pass


@app.get("/modified")
def show_modified(limit: int = 10, offset: int = 0):
    pass


@app.get("/background")
def show_background(limit: int = 10, offset: int = 0):
    pass


@app.get("/login")
def login(login: str, passw: str):
    if login == "admin" and passw == "admin":
        return {"status": 200, "mess": "OK"}
    else: return {"status": 404, "mess": "Bad Value"}