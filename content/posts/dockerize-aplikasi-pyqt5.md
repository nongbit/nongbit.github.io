---
title: "Dockerize PyQt5 Application"
date: 2026-08-14T08:00:00+07:00
draft: false
summary: "Panduan lengkap membuat environment PyQt5 dengan Docker, dari development hingga production."
categories: ["teknologi", "docker", "pyqt5"]
tags: ["python", "docker-compose", "gui", "production"]
---

## Pendahuluan

PyQt5 adalah binding Python untuk framework GUI Qt. Mengembangkan aplikasi GUI di dalam container Docker memastikan aplikasi berjalan dengan dependensi yang tepat (versi Qt, library sistem) tanpa mencemari sistem host.

Artikel ini akan memandu Anda dari nol hingga aplikasi `hello world` PyQt5 yang tampilannya muncul langsung di desktop Cinnamon host. Kita akan membahas persiapan sistem, Dockerfile, Docker Compose, workflow memulai proyek, development harian, dan multi-stage build untuk produksi.

## Prasyarat Sistem

Sebelum memulai, pastikan sistem Anda (Debian Trixie dengan desktop Cinnamon) memenuhi persyaratan berikut:

### Hardware (Minimum)
- Prosesor: Dual-core 2.0 GHz atau lebih
- RAM: 4 GB (8 GB atau lebih disarankan)
- Ruang Disk: 10 GB ruang kosong (ditambah ~500 MB untuk wheelhouse PyQt5)

### Software
- **Docker Engine** (versi 24.0+) dan **Docker Compose Plugin** (V2) sudah terinstal dan grup docker sudah aktif
- **X11 Server** (sudah ada di desktop Cinnamon)
- **Git** untuk manajemen versi
- **Visual Studio Code** (opsional)
- **Make** (sudah termasuk dalam `build-essential`)
- **Python 3** dan **pip** (untuk membuat wheelhouse)

### Ekstensi VSCode yang Direkomendasikan
- `Docker` (oleh Microsoft) – mengelola container dari VSCode
- `Makefile Tools` (oleh Microsoft) – menjalankan target `make`
- `Python` (oleh Microsoft) – intellisense dan debugging Python
- `Pylance` – type checking Python
- `Qt for Python` – autocomplete untuk PyQt5/PySide6

## Persiapan Host (Sekali)

Jalankan perintah berikut di terminal untuk menginstal paket yang diperlukan:

```bash
sudo apt update
sudo apt install -y \
    curl \
    git \
    build-essential \
    make \
    libgl1-mesa-glx \
    x11-xserver-utils \
    python3 \
    python3-venv \
    python3-pip
```

### (Opsional) Membuat Wheelhouse PyQt5 untuk Percepatan Build

PyQt5 adalah paket Python yang sangat besar (~30 MB). Menyimpan `wheel` (paket biner) di direktori `~/wheelhouse` membuat `docker build` jauh lebih cepat karena tidak perlu mengunduh dan mengkompilasi setiap kali.

```bash
mkdir -p ~/wheelhouse
python3 -m venv /tmp/wheel-env
source /tmp/wheel-env/bin/activate
pip install --upgrade pip
pip download --dest ~/wheelhouse PyQt5
deactivate
rm -rf /tmp/wheel-env
```

## Struktur Proyek

```
~/projects/hello/
├─ pyproject.toml
├─ Dockerfile
├─ docker-compose.yml
├─ Makefile
├─ src/
│  └─ app.py
└─ tests/
```

## Poetry Configuration

**`pyproject.toml`**:

```toml
[tool.poetry]
name = "hello"
version = "0.1.0"
description = "A simple PyQt5 Hello World app"
authors = ["Your Name <email@example.com>"]
package-mode = false

[tool.poetry.dependencies]
python = "^3.11"
PyQt5 = "^5.15"

[tool.poetry.group.dev.dependencies]
pytest = "^7.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

## Kode Sumber Aplikasi

**`src/app.py`**:

```python
import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QLabel, QVBoxLayout, QWidget

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Hello PyQt in Docker")
        self.setGeometry(100, 100, 400, 200)
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout()
        central_widget.setLayout(layout)
        label = QLabel("Hello from PyQt5 inside a Docker container!")
        label.setStyleSheet("font-size: 20px; font-weight: bold; color: #2980b9;")
        layout.addWidget(label)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
```

## Dockerfile untuk Development

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for PyQt5 and X11
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxcb-xinerama0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libxcb-xkb1 \
    libxkbcommon-x11-0 \
    libdbus-1-3 \
    libxcb-cursor0 \
    libfontconfig1 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy wheelhouse from host if exists (to speed up PyQt5 installation)
COPY /wheelhouse /wheelhouse 2>/dev/null || true

COPY pyproject.toml poetry.lock* /workspace/

RUN pip install --upgrade pip \
    && pip install poetry \
    && poetry config virtualenvs.create false

# Install PyQt5 from wheelhouse if available, otherwise from PyPI
RUN if [ -d "/wheelhouse" ]; then \
        pip install --no-index --find-links /wheelhouse PyQt5; \
    else \
        pip install PyQt5; \
    fi

# Install other dependencies (without the project itself)
RUN poetry install --no-interaction --no-ansi --no-root

COPY . /workspace

RUN useradd --create-home dev && chown -R dev:dev /workspace
USER dev

ENV DISPLAY=:0
ENV QT_X11_NO_MITSHM=1

CMD ["python", "src/app.py"]
```

### Penjelasan Best Practices:
- **Dependensi sistem** mencakup library X11 dan OpenGL (`libgl1`) yang diperlukan PyQt5.
- **Wheelhouse** diperiksa dan disalin jika ada di host, kemudian digunakan oleh `pip install --find-links` untuk mempercepat build.
- **User `dev` non-root** meningkatkan keamanan.
- **Environment variables** `DISPLAY` dan `QT_X11_NO_MITSHM` diperlukan agar GUI muncul di host.

## Docker Compose

```yaml
services:
  app:
    build: .
    volumes:
      - ./src:/workspace/src:delegated
      - ~/wheelhouse:/wheelhouse:ro
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
    environment:
      - PYTHONUNBUFFERED=1
      - DISPLAY=${DISPLAY:-:0}
      - QT_X11_NO_MITSHM=1
      - LIBGL_ALWAYS_SOFTWARE=1
      - GALLIUM_DRIVER=llvmpipe
```

### Penjelasan:
- **Volume X11**: `/tmp/.X11-unix` adalah socket komunikasi dengan X server.
- **Volume Wheelhouse**: Mount `~/wheelhouse` dari host ke container sebagai read‑only (berguna jika container perlu mengakses wheel di runtime, meskipun build sudah memanfaatkannya).
- **Variabel lingkungan untuk software rendering** – opsional, membantu jika tidak ada akselerasi GPU.

## Makefile

```makefile
build:
    docker compose build --no-cache

up:
    @echo "Setting X11 permissions..."
    xhost +local:
    docker compose up

down:
    docker compose down
    xhost -local:

shell:
    docker compose run --rm app bash

test:
    docker compose run --rm app poetry run pytest

wheelhouse:
    @echo "Creating PyQt5 wheelhouse at ~/wheelhouse..."
    mkdir -p ~/wheelhouse
    python3 -m venv /tmp/wheel-env
    . /tmp/wheel-env/bin/activate && pip download --dest ~/wheelhouse PyQt5
    deactivate
    rm -rf /tmp/wheel-env

lock:
    docker compose run --rm app poetry lock
```

> **Catatan Keamanan X11:** `xhost +local:` mengizinkan koneksi dari semua program lokal (termasuk container) tanpa autentikasi tambahan, tetapi tetap aman karena tidak membuka akses dari jaringan. Jika container mati mendadak, izin tetap terbuka; tutup secara manual dengan `xhost -local:` atau jalankan `make down`.

## Workflow: Memulai Proyek Baru

```bash
# 1. Buat direktori proyek
mkdir -p ~/projects/hello
cd ~/projects/hello

# 2. Buat file pyproject.toml dan src/app.py sesuai template

# 3. Buat Dockerfile, docker-compose.yml, dan Makefile sesuai template

# 4. (Opsional) Buat wheelhouse
make wheelhouse

# 5. (Opsional) Buat poetry.lock (jika belum ada)
make lock

# 6. Bangun image
make build

# 7. Jalankan aplikasi
make up

# Sebuah jendela GUI akan muncul di desktop Anda

# 8. Hentikan aplikasi
make down
```

## Workflow Development Harian

### Mengedit Kode
Ubah `src/app.py` atau file lain. Karena volume terpasang, perubahan langsung terlihat. Untuk melihat perubahan GUI, restart container (`Ctrl+C` lalu `make up`).

### Masuk ke Container Shell
```bash
make shell
poetry run python src/app.py  # Jalankan langsung untuk debugging
exit
```

### Menjalankan Tests
```bash
make test
```

### Debugging
Gunakan `ipdb` atau `pdb` dengan breakpoint. Jalankan container dengan `docker compose run --rm app` agar input terminal dapat diteruskan.

### Rebuild Image

Jika ada perubahan dependensi di pyproject.toml maka build ulang image.

```bash
make build
```

### Menghentikan Container
```bash
make down
```

## Multi-Stage Build untuk Production

Untuk production, hilangkan alat build (`build-essential`) dan hanya sisakan library runtime.

```dockerfile
# Stage 1: builder
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxcb-xinerama0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libxcb-xkb1 \
    libxkbcommon-x11-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy wheelhouse if exists
COPY /wheelhouse /wheelhouse 2>/dev/null || true

COPY pyproject.toml poetry.lock* /workspace/
RUN pip install --upgrade pip \
    && pip install poetry \
    && poetry config virtualenvs.create false

RUN if [ -d "/wheelhouse" ]; then \
        pip install --no-index --find-links /wheelhouse PyQt5; \
    else \
        pip install PyQt5; \
    fi

RUN poetry install --no-interaction --no-ansi --no-dev

COPY . /workspace

# Stage 2: production
FROM python:3.11-slim

# Install ONLY runtime libraries (without build-essential)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxcb-xinerama0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libxcb-xkb1 \
    libxkbcommon-x11-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY --from=builder /workspace /workspace

RUN useradd --create-home dev && chown -R dev:dev /workspace
USER dev

ENV DISPLAY=:0
ENV QT_X11_NO_MITSHM=1

# Poetry is not needed at runtime
CMD ["python", "src/app.py"]
```

**Membangun image production:**
```bash
docker build --target production -t pyqt-app:prod .
```

## Kesimpulan

Dengan pendekatan ini, Anda dapat mengembangkan aplikasi PyQt5 yang terisolasi di dalam container Docker namun tetap dapat menampilkan GUI di desktop host. Wheelhouse mempercepat build, X11 forwarding memungkinkan GUI muncul, dan multi-stage build menghasilkan image produksi yang ramping.