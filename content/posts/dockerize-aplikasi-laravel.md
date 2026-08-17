---
title: "Dockerize Aplikasi Laravel"
date: 2026-08-17T08:00:00+07:00
draft: false
summary: "Panduan lengkap Dockerize Laravel dari development hingga production dengan arsitektur production-grade dan struktur folder modular."
categories: ["teknologi", "docker", "laravel"]
tags: ["php", "laravel", "docker-compose", "nginx", "production", "devops"]
---

## Pendahuluan

Laravel adalah framework PHP paling populer dengan ekosistem yang sangat kaya. Menggunakan Docker untuk pengembangan Laravel memastikan environment (versi PHP, ekstensi, database, queue worker, dan scheduler) konsisten, baik saat development di lokal maupun saat deployment ke production.

Artikel ini akan memandu Anda dari nol hingga aplikasi Laravel production-grade di dalam container Docker. Kita akan membahas:

- Persiapan sistem
- Struktur folder modular (`docker/` dan `codebase/`)
- Dockerfile multi-stage untuk production
- Docker Compose untuk development dan production terpisah
- Nginx sebagai web server + PHP-FPM sebagai processor
- Queue worker dan scheduler dengan Supervisor
- Asset building (NPM/Vite) di dalam build process
- Workflow development harian
- Deployment ke production

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
sudo apt install -y \
    curl \
    git \
    build-essential \
    make
```

## Struktur Proyek

```
~/projects/laravel-app/
├── docker/
│   ├── common/
│   │   └── php-fpm/
│   │       ├── Dockerfile
│   │       └── conf.d/
│   │           └── 20-status-path.conf
│   ├── development/
│   │   └── php-fpm/
│   │       ├── entrypoint.sh
│   │       └── xdebug.ini
│   └── production/
│       ├── php-fpm/
│       │   ├── entrypoint.sh
│       │   └── supervisord.conf
│       └── nginx/
│           ├── Dockerfile
│           └── nginx.conf
├── codebase/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── tests/
│   ├── .env.example
│   ├── artisan
│   ├── composer.json
│   ├── composer.lock
│   ├── package.json
│   ├── package-lock.json
│   └── (other Laravel files)
├── compose.dev.yaml
├── compose.prod.yaml
├── .dockerignore
├── .env.example
├── Makefile
└── .gitignore
```

Struktur ini memisahkan konfigurasi (folder `docker/`) dari kode aplikasi (folder `codebase/`). Dengan demikian, Anda dapat menggunakan kumpulan file Docker yang sama untuk berbagai proyek dengan hanya mengganti isi `codebase/`.

## Dockerfile untuk PHP-FPM (Production & Development)

**`docker/common/php-fpm/Dockerfile`** — base Dockerfile yang digunakan bersama oleh development dan production:

```dockerfile
# Stage 1: Composer dependencies builder
FROM php:8.4-fpm-alpine AS composer-builder

# Install system dependencies for Laravel
RUN apk add --no-cache \
    git \
    curl \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    intl \
    zip \
    && apk del --no-cache \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    postgresql-dev

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy only composer files from the codebase folder for better layer caching
COPY codebase/composer.json codebase/composer.lock ./

# Install PHP dependencies (with dev dependencies for development)
RUN composer install --no-interaction --optimize-autoloader --no-scripts

# Stage 2: Node.js asset builder
FROM node:22-alpine AS node-builder

WORKDIR /var/www

# Copy package files first for better caching
COPY codebase/package.json codebase/package-lock.json ./
RUN npm ci

# Copy only what's needed for building assets (optimized layer caching)
COPY codebase/resources/ resources/
COPY codebase/public/ public/
COPY codebase/vite.config.js ./
COPY codebase/postcss.config.js ./
COPY codebase/tailwind.config.js ./

# Build frontend assets (Vite, Mix, etc.)
RUN npm run build

# Stage 3: Final runtime image
FROM php:8.4-fpm-alpine

# Install runtime system dependencies only (minimal)
RUN apk add --no-cache \
    libzip \
    libpng \
    libjpeg-turbo \
    freetype \
    icu \
    postgresql-client \
    supervisor \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    intl \
    zip \
    opcache

# Install Redis extension (optional, for cache/queue)
RUN apk add --no-cache redis \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del --no-cache redis

# Copy PHP-FPM configuration
COPY docker/common/php-fpm/conf.d/20-status-path.conf /usr/local/etc/php-fpm.d/

WORKDIR /var/www

# Copy application from composer-builder
COPY --from=composer-builder /var/www /var/www

# Copy built assets from node-builder
COPY --from=node-builder /var/www/public/build /var/www/public/build

# Set proper permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Copy environment-specific entrypoint
COPY docker/${ENVIRONMENT:-production}/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy supervisor configuration (production only)
COPY docker/production/php-fpm/supervisord.conf /etc/supervisord.conf

# Health check - actual PHP-FPM status
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD php-fpm -t || exit 1

USER www-data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
```

### Penjelasan Best Practices:
- **Multi-stage build** tiga tahap: Composer, Node.js, dan runtime final
- **Layer caching** yang dioptimalkan — `composer.json` dan `package.json` disalin terlebih dahulu; file asset building disalin secara terpisah
- **Alpine Linux** sebagai base — image sangat kecil (~80MB)
- **Hanya runtime dependencies** di final image — alat build dihapus
- **Opcache** diaktifkan untuk performa production
- **Health check** memeriksa konfigurasi PHP-FPM
- **User www-data** non-root untuk keamanan

## Dockerfile untuk Nginx (Production)

**`docker/production/nginx/Dockerfile`** :

```dockerfile
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check for nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
```

**`docker/production/nginx/nginx.conf`** :

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## Xdebug Configuration (Development)

**`docker/development/php-fpm/xdebug.ini`** :

```ini
zend_extension=xdebug.so
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.idekey=DOCKER
xdebug.log=/dev/stdout
xdebug.log_level=0
```

## Entrypoint Script untuk Development

**`docker/development/php-fpm/entrypoint.sh`** :

```bash
#!/bin/sh
set -e

# Install Xdebug in development
if [ "$XDEBUG_ENABLED" = "true" ]; then
    apk add --no-cache $PHPIZE_DEPS \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && cp /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini /usr/local/etc/php/conf.d/20-xdebug.ini \
    && echo "Xdebug installed"
fi

# Run database migrations in development
if [ "$RUN_MIGRATIONS" = "true" ]; then
    php artisan migrate
fi

exec php-fpm
```

## Entrypoint Script untuk Production

**`docker/production/php-fpm/entrypoint.sh`** :

```bash
#!/bin/sh
set -e

# Run Laravel optimizations for production
if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
fi

# Start Supervisor (manages queue worker and scheduler)
exec supervisord -c /etc/supervisord.conf
```

**`docker/production/php-fpm/supervisord.conf`** :

```ini
[supervisord]
nodaemon=true
user=www-data
logfile=/dev/null
logfile_maxbytes=0
pidfile=/tmp/supervisord.pid

[program:php-fpm]
command=php-fpm
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:laravel-worker]
command=php artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:laravel-scheduler]
command=php artisan schedule:work
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

> **Catatan:** `schedule:work` adalah pendekatan yang direkomendasikan sejak Laravel 8 karena menangani loop secara internal dan lebih efisien dibandingkan `schedule:run` yang memerlukan cron.

## .dockerignore

**`.dockerignore`** (di root proyek):

```
.git
.gitignore
.env
.env.*
*.log
*.sqlite
*.sqlite-journal
codebase/node_modules
codebase/vendor
codebase/storage/*.key
codebase/public/hot
codebase/public/storage
codebase/storage/framework/cache
codebase/storage/framework/sessions
codebase/storage/framework/views
codebase/tests/
codebase/.phpunit.cache
.idea
.vscode
.DS_Store
Thumbs.db
*.swp
*.swo
docker/
compose.*.yaml
Makefile
```

## Docker Compose untuk Development

**`compose.dev.yaml`** :

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/common/php-fpm/Dockerfile
      args:
        - ENVIRONMENT=development
    user: "${UID:-1000}:${GID:-1000}"
    volumes:
      - ./codebase:/var/www:delegated
      - ./docker/development/php-fpm/entrypoint.sh:/usr/local/bin/entrypoint.sh:ro
      - ./docker/development/php-fpm/xdebug.ini:/usr/local/etc/php/conf.d/20-xdebug.ini:ro
    environment:
      - APP_ENV=local
      - APP_DEBUG=true
      - APP_KEY=${APP_KEY:-}
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=laravel
      - DB_USERNAME=laravel
      - DB_PASSWORD=secret
      - RUN_MIGRATIONS=true
      - XDEBUG_ENABLED=true
      - XDEBUG_MODE=debug
      - PHP_IDE_CONFIG=serverName=localhost
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "php", "-v"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  webserver:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./codebase:/var/www:delegated
      - ./docker/production/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=laravel
      - MYSQL_USER=laravel
      - MYSQL_PASSWORD=secret
      - MYSQL_ROOT_PASSWORD=rootsecret
    ports:
      - "3307:3306"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

volumes:
  db_data:
```

## Docker Compose untuk Production

**`compose.prod.yaml`** :

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/common/php-fpm/Dockerfile
      args:
        - ENVIRONMENT=production
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - APP_KEY=${APP_KEY}
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=${DB_DATABASE}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./docker/production/php-fpm/supervisord.conf:/etc/supervisord.conf:ro
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "php", "-v"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  webserver:
    build:
      context: ./docker/production/nginx
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT:-80}:80"
    volumes:
      - ./codebase:/var/www:ro
    depends_on:
      - app
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=${DB_DATABASE}
      - MYSQL_USER=${DB_USERNAME}
      - MYSQL_PASSWORD=${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

volumes:
  db_data:
```

## .env.example untuk Root Proyek

**`.env.example`** (di root proyek, berbeda dengan `.env` di dalam `codebase/`):

```
# Database configuration for production
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=secret
DB_ROOT_PASSWORD=rootsecret

# Application key (generate with `make dev-artisan cmd="key:generate"`)
APP_KEY=

# Port mapping for production
APP_PORT=80
```

## Makefile

```makefile
# Development commands
dev-build:
  docker compose -f compose.dev.yaml build

dev-up:
  docker compose -f compose.dev.yaml up -d

dev-down:
  docker compose -f compose.dev.yaml down

dev-logs:
  docker compose -f compose.dev.yaml logs -f

dev-shell:
  docker compose -f compose.dev.yaml exec app sh

dev-artisan:
  docker compose -f compose.dev.yaml exec app php artisan $(cmd)

dev-migrate:
  docker compose -f compose.dev.yaml exec app php artisan migrate

dev-fresh:
  docker compose -f compose.dev.yaml exec app php artisan migrate:fresh --seed

dev-test:
  docker compose -f compose.dev.yaml exec app php artisan test

# Production commands
prod-build:
  docker compose -f compose.prod.yaml build

prod-up:
  docker compose -f compose.prod.yaml up -d

prod-down:
  docker compose -f compose.prod.yaml down

prod-logs:
  docker compose -f compose.prod.yaml logs -f

prod-shell:
  docker compose -f compose.prod.yaml exec app sh

# Utility commands
create-project:
  docker run --rm -v $(PWD)/codebase:/app composer:latest create-project laravel/laravel .
  @echo "Fixing file permissions..."
  sudo chown -R $(shell id -u):$(shell id -g) codebase

init-env:
  cp .env.example .env
  @echo "Please update .env with your configuration"

# Default target
.PHONY: dev-build dev-up dev-down dev-logs dev-shell dev-artisan dev-migrate dev-fresh dev-test prod-build prod-up prod-down prod-logs prod-shell create-project init-env
```

## Workflow: Memulai Proyek Baru

Ikuti langkah-langkah berikut dari awal:

```bash
# 1. Buat direktori proyek dan struktur folder
mkdir -p ~/projects/laravel-app
cd ~/projects/laravel-app
mkdir -p docker/common/php-fpm/conf.d
mkdir -p docker/development/php-fpm
mkdir -p docker/production/php-fpm
mkdir -p docker/production/nginx
mkdir codebase

# 2. Buat semua file Docker, Nginx, Xdebug, dan Supervisor sesuai template di atas

# 3. Buat proyek Laravel di dalam folder codebase menggunakan Composer
make create-project

# 4. Buat file .env di root proyek (untuk production)
make init-env

# 5. Masuk ke folder codebase dan buat .env untuk development
cd codebase
cp .env.example .env
# Sesuaikan konfigurasi database jika perlu (default sudah cocok dengan compose.dev.yaml)
cd ..

# 6. Generate application key
make dev-artisan cmd="key:generate"

# 7. Bangun image development
make dev-build

# 8. Jalankan container
make dev-up

# 9. Akses di browser: http://localhost:8080
# Anda akan melihat halaman selamat datang Laravel

# 10. Jalankan migrasi database
make dev-migrate
```

## Workflow Development Harian

### Mengedit Kode
Ubah file di `codebase/` (misalnya `codebase/routes/web.php`). Karena volume terpasang, perubahan langsung terlihat di container. Untuk perubahan environment atau dependensi, lakukan rebuild.

### Menjalankan Artisan Commands
```bash
make dev-artisan cmd="make:model User"
make dev-artisan cmd="make:controller UserController"
make dev-artisan cmd="route:list"
```

### Menjalankan Tests
```bash
make dev-test
```

### Melihat Logs
```bash
make dev-logs
```

### Masuk ke Container Shell
```bash
make dev-shell
```

### NPM / Vite untuk Frontend
```bash
# Di dalam container shell (setelah masuk dengan make dev-shell)
cd /var/www
npm install
npm run dev
```

### Menghentikan Container
```bash
make dev-down
```

## Workflow Production

### Membangun Image Production
```bash
# Siapkan .env di root proyek dengan konfigurasi production
vim .env

make prod-build
```

### Menjalankan Production
```bash
make prod-up

# Akses di browser: http://localhost (atau port yang dikonfigurasi di .env)
```

### Melihat Logs Production
```bash
make prod-logs
```

### Menghentikan Production
```bash
make prod-down
```

## Multi-Stage Build: Penjelasan Detail

Multi-stage build pada Dockerfile di atas terdiri dari tiga tahap:

### Stage 1: Composer Builder
- Menginstal semua ekstensi PHP yang diperlukan
- Menginstal dependensi PHP melalui Composer dengan mengambil file dari `codebase/`
- Layer caching memastikan `composer install` hanya dijalankan saat `composer.json` berubah

### Stage 2: Node.js Builder
- Menginstal dependensi NPM dari `codebase/package.json`
- Menyalin hanya file yang diperlukan untuk build assets (`resources/`, `vite.config.js`, dll.)
- Menjalankan `npm run build` untuk mengompilasi assets frontend (Vite, Mix, dll.)

### Stage 3: Runtime Final
- Hanya menyalin hasil dari dua stage sebelumnya
- Tidak menyertakan alat build (Composer, Node.js, git, compiler)
- Image final sangat kecil dan aman

## Keunggulan Struktur Modular

Dengan memisahkan `docker/` dan `codebase/`, Anda mendapatkan:

1. **Reusability** — folder `docker/` dan file konfigurasi (compose, Makefile) dapat digunakan untuk proyek Laravel lain tanpa perubahan.
2. **Clean separation** — kode aplikasi tidak tercampur dengan konfigurasi infrastruktur.
3. **Easy upgrades** — pembaruan versi PHP, Nginx, atau Laravel tidak saling mengganggu.
4. **Simplified CI/CD** — pipeline dapat menyalin `codebase/` yang sudah dibangun tanpa membawa file Docker.

## Kesimpulan

Dengan pendekatan ini, Anda memiliki environment Laravel yang:

1. **Konsisten** — development dan production menggunakan konfigurasi yang sama
2. **Ringan** — image Alpine + multi-stage menghasilkan image kecil
3. **Aman** — non-root user, health checks, dan minimasi attack surface
4. **Production-grade** — Nginx + PHP-FPM, queue worker, scheduler, dan opcache
5. **Modular** — struktur folder yang rapi dan reusable
6. **Developer-friendly** — volume mounting, Xdebug, dan Artisan commands tersedia

Workflow ini memudahkan kolaborasi tim karena semua orang menggunakan konfigurasi yang sama, dan deployment ke production tinggal menjalankan `make prod-up`.