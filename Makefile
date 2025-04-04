.DEFAULT_GOAL := all

IMAGE_NAME := fullstack_on_ubuntu

all: build run

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run -it --rm -p 8000:8000 -p 3000:3000 -v `pwd`/app/app:/app -v `pwd`/ui:/ui -v `pwd`/app/data:/data -v `pwd`/app/dump:/dump -v `pwd`/log:/var/log/mongo --name $(IMAGE_NAME) $(IMAGE_NAME) 

clean:
	docker rmi $(IMAGE_NAME)
