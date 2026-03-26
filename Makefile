.PHONY: build run clean frontend backend

build: frontend backend

frontend:
	npm run build

backend:
	go build -o bloomberg-terminal .

run: build
	./bloomberg-terminal

clean:
	rm -rf out .next bloomberg-terminal
