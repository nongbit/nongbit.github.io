---
title: "Dockerize Aplikasi Laravel"
date: 2026-08-13T08:00:00+07:00
draft: false
summary: "Panduan lengkap membuat environment Laravel dengan Docker, dari development hingga production."
categories: ["teknologi", "docker", "laravel"]
tags: ["php", "docker-compose", "development", "production"]
---

## Pendahuluan

Laravel adalah framework PHP yang populer dengan ekosistem yang kaya. Menggunakan Docker untuk pengembangan Laravel memastikan bahwa environment (versi PHP, ekstensi, dan database) konsisten, baik saat development di lokal maupun saat deployment.

Artikel ini akan memandu Anda dari nol hingga aplikasi `hello world` Laravel berjalan di dalam container Docker. Kita akan membahas persiapan sistem, Dockerfile, Docker Compose, workflow memulai proyek baru, workflow development harian, hingga multi-stage build untuk produksi.

## Prasyarat Sistem

Sebelum memulai, pastikan sistem Anda (Debian Trixie dengan desktop Cinnamon) memenuhi persyaratan berikut:

### Hardware (Minimum)
- Prosesor: Dual-core 2.0 GHz atau lebih
- RAM: 4 GB (8 GB atau lebih disarankan)
- Ruang Disk: 10 GB ruang kosong

### Software
- **Docker Engine** (versi 24.0+) dan **Docker Compose Plugin** (V2) sudah terinstal dan grup docker sudah aktif
- **Git** untuk manajemen versi
- **Visual Studio Code** (opsional, tapi sangat membantu)
- **Make** (sudah termasuk dalam `build-essential`)

### Ekstensi VSCode yang Direkomendasikan
- `Docker` (oleh Microsoft) – mengelola container dari VSCode
- `Makefile Tools` (oleh Microsoft) – menjalankan target `make`
- `DotENV` – menyoroti sintaks file `.env`
- `PHP Intelephense` – autocomplete dan debugging PHP
- `Laravel Extension Pack` – dukungan Blade, Artisan, dan routing
- `MySQL` atau `SQLTools` – melihat database

## Persiapan Host (Sekali)

Jalankan perintah berikut di terminal untuk menginstal paket yang diperlukan:

```bash
sudo apt update
sudo apt install -y curl git build-essential make
```

## Struktur Proyek

```
~/projects/laravel-app/
├─ Dockerfile
├─ docker-compose.yml
├─ Makefile
└─ (Laravel project files setelah create-project)
```

## Dockerfile untuk Development

```dockerfile
# Dockerfile
FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory contents
COPY . /var/www/html

# Install PHP dependencies (with dev dependencies for development)
RUN composer install --no-interaction --optimize-autoloader

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

EXPOSE 80

CMD ["apache2-foreground"]
```

### Penjelasan Best Practices:
- **Image base `php:8.2-apache`** sudah menyertakan Apache, jadi tidak perlu instal web server terpisah.
- **Optimasi Autoloader** (`--optimize-autoloader`) meningkatkan performa.
- **Dev dependencies** tetap diinstal karena kita butuh alat seperti Debugbar atau PHPUnit saat development.
- **User `www-data`** digunakan untuk menjalankan aplikasi, bukan root.

## Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:80"   # Ubah jika port bentrok, misal 8081:80
    volumes:
      - ./:/var/www/html:delegated
    environment:
      - APP_ENV=local
      - APP_DEBUG=true
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=laravel
      - DB_USERNAME=laravel
      - DB_PASSWORD=secret
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=laravel
      - MYSQL_USER=laravel
      - MYSQL_PASSWORD=secret
      - MYSQL_ROOT_PASSWORD=rootsecret
    ports:
      - "3307:3306" # Ubah jika port bentrok, misal 3308:3306
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

> **Catatan:** Jika port `8080` atau `3307` sudah digunakan, ubah angka di sisi kiri (host), misal `8081:80` atau `3308:3306`.

## Makefile

```makefile
# Makefile
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

shell:
	docker compose exec app bash

migrate:
	docker compose exec app php artisan migrate

fresh:
	docker compose exec app php artisan migrate:fresh --seed

logs:
	docker compose logs -f

test:
	docker compose exec app php artisan test

create-project:
	docker run --rm -v $(PWD):/app composer create-project laravel/laravel .
```

## Workflow: Memulai Proyek Baru

Ikuti langkah-langkah berikut dari awal:

```bash
# 1. Buat direktori proyek
mkdir -p ~/projects/laravel-app
cd ~/projects/laravel-app

# 2. Buat proyek Laravel menggunakan Composer di dalam container
make create-project

# 3. PERINGATAN PENTING: File hasil create-project dimiliki oleh root
#    Segera perbaiki kepemilikannya agar bisa diedit di VSCode
sudo chown -R $USER:$USER .

# 4. Salin Dockerfile, docker-compose.yml, dan Makefile ke direktori ini

# 5. Bangun image
make build

# 6. Jalankan container
make up

# 7. Akses di browser: http://localhost:8080
#    Anda akan melihat halaman selamat datang Laravel

# 8. Jalankan migrasi database
make migrate
```

## Workflow Development Harian

Setelah proyek berjalan, berikut aktivitas sehari-hari:

### Mengedit Kode
Ubah file di host (misalnya `routes/web.php`). Karena volume terpasang, perubahan langsung terlihat di container. Untuk perubahan environment atau dependensi, lakukan rebuild.

### Menjalankan Artisan Commands
```bash
make shell
php artisan make:model User
php artisan make:controller UserController
php artisan route:list
exit
```

### Menjalankan Tests
```bash
make test
```

### Melihat Logs
```bash
make logs
```

### Debugging dengan Xdebug
Tambahkan `docker-compose.override.yml`:

```yaml
services:
  app:
    environment:
      - XDEBUG_MODE=debug
      - XDEBUG_CONFIG=client_host=host.docker.internal
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Menghentikan Container
```bash
make down
```

## Multi-Stage Build untuk Production

Untuk production, kita menginginkan image yang lebih kecil dan aman. Multi-stage build memisahkan build environment dari runtime environment.

```dockerfile
# Stage 1: builder
FROM php:8.2-apache AS builder

RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-interaction --optimize-autoloader --no-dev

COPY . .
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Stage 2: production
FROM php:8.2-apache

RUN a2enmod rewrite
COPY --from=builder /var/www/html /var/www/html

WORKDIR /var/www/html
EXPOSE 80
CMD ["apache2-foreground"]
```

**Membangun image production:**
```bash
docker build --target production -t laravel-app:prod .
```

## Kesimpulan

Dengan pendekatan ini, Anda memiliki environment Laravel yang terisolasi dan konsisten. Workflow ini memudahkan kolaborasi tim karena semua orang menggunakan konfigurasi yang sama. Multi-stage build menghasilkan image produksi yang ramping dan aman.
