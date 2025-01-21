.DEFAULT_GOAL := all

IMAGE_NAME := fullstack_on_ubuntu

all: build run

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run -it --rm -p 8000:8000 -p 3000:3000 -v `pwd`/app/app:/app -v `pwd`/ui:/ui --name $(IMAGE_NAME) $(IMAGE_NAME) #-v var/lib/mongodb:/data/db -v `pwd`/log:/var/log/mongo

clean:
	docker rmi $(IMAGE_NAME)
