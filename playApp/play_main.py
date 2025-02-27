import os, tempfile
from subprocess import check_output
from fastapi import FastAPI, UploadFile, File

app = FastAPI()

@app.get("/hello")
async def get_hello():
    return("Hello world!")