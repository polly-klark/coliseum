SHELL := /bin/bash
.DEFAULT_GOAL := all

all: build run

build: 
	python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
run: 
	source venv/bin/activate && uvicorn play_main:app --host 0.0.0.0 --port 9000 --log-level info --reload