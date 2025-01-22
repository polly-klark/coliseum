# 1. Установка docker

## На Debian

### Удаляем ранее установленные пакеты:

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt remove $pkg; done
```

### Добавляем репозиторий docker:

```bash
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
```

### Добавляем текущего пользователя в группу docker:

```bash
sudo usermod -aG docker ${USER}
```

## На Ubuntu

### Удаляем ранее установленные пакеты:

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt remove $pkg; done
```

### Добавляем репозиторий docker:

```bash
sudo apt update
sudo apt -y install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
```

### Устанавливаем пакеты:

```bash
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Добавляем текущего пользователя в группу docker:

```bash
sudo usermod -aG docker ${USER}
```

# 2. Установка дополнительных пакетов:

```bash
sudo apt install make
```

# 3. Запуск СПО

### 1. Останавливаем все docker-контейнеры

```bash
docker stop $(docker ps -aq)
```

### 2. Удаляем старую версию СПО

```bash
rm -rf ~/src/*
```

### 3. Копируем архив с СПО в директорию src в домашнюю директорию пользователя

### 4. Распаковываем архив с СПО

```bash
tar xvf template-fastapi-react.tar.xz
```

### 5. Удаляем старые контейнеры

```bash
docker system prune --all
```

### 6. Переходим в директорию с проектом

```bash
cd ~/src/template-fastapi-react
```

### 7. Запускаем СПО

#### Неоптимизированная версия

```bash
make
```

#### Оптимизированная версия

```bash
docker compose up -d
```

# Примечание

Если docker ранее уже был установлен действия указанные в разделе 1 можно не выполнять.
Если СПО более ранних версий не запускалось подпункты 1,2,5 раздела 3 можно не выполнять.
Оптимизированная версия пока не работоспособна. Показывать на неоптимизированной.
