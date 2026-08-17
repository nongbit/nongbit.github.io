---
title: "Rekomendasi Struktur Direktori untuk Proyek Sederhana"
date: 2026-07-17T11:21:00+07:00
summary: "Panduan praktis struktur proyek berbasis Docker Compose yang mengikuti konvensi terkini."
categories: ["DevOps", "Docker"]
tags: ["docker", "docker-compose", "project-structure", "best-practices"]
draft: false
---

Dalam pengembangan aplikasi modern, Docker Compose telah menjadi alat standar untuk mengelola aplikasi multi-kontainer. Namun, pertanyaan yang sering muncul adalah: **bagaimana struktur direktori yang paling tepat dan efisien?**

---

## Konvensi Terkini Docker Compose

Sebelum membahas struktur, penting untuk memahami konvensi yang ditetapkan oleh Docker sendiri.

### Lokasi Default File Compose

Berdasarkan dokumentasi resmi Docker, **lokasi default untuk file Compose adalah `compose.yaml` (direkomendasikan) atau `compose.yml` yang diletakkan di direktori kerja** (working directory). Docker juga mendukung `docker-compose.yaml` dan `docker-compose.yml` untuk kompatibilitas mundur, namun `compose.yaml` adalah yang paling dianjurkan.

### Fitur Penting yang Perlu Diketahui

1. **Field `version` sudah usang (obsolete)** sejak Docker Compose v2.42.
2. **File override otomatis**: `compose.override.yaml` akan secara otomatis digabung jika berada di direktori yang sama dengan `compose.yaml`.
3. **Multiple file**: Anda dapat menggunakan opsi `-f` untuk menentukan beberapa file Compose, dan file yang disebutkan terakhir akan menimpa konfigurasi sebelumnya.

---

## Struktur Proyek yang Direkomendasikan

Berdasarkan praktik terbaik terkini dan konvensi Docker, berikut adalah struktur proyek yang saya rekomendasikan untuk proyek berskala kecil hingga menengah:

```
~/projects/hello/
├── compose.yaml                 # Base Compose (konvensi default Docker)
├── compose.override.yaml        # Auto-loaded untuk development (opsional)
├── .env                         # Environment variables untuk Compose
├── .dockerignore
├── .gitignore
├── Makefile                     # Entry point untuk semua command
│
├── backend/                     # Service backend (atau sesuai nama)
│   ├── src/                     # Kode sumber utama
│   ├── tests/                   # Unit test
│   ├── Dockerfile
│   └── requirements.txt         # atau package.json, go.mod, dll
│
├── frontend/                    # Service frontend (jika ada)
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── docker/                      # Artefak Docker tambahan
│   ├── compose.prod.yaml        # Override untuk production
│   └── env/
│       ├── .env.example         # Template untuk developer baru
│       └── .env.prod
│
├── data/                        # Data persisten (bind mount)
│   └── db/
│
└── docs/                        # Dokumentasi proyek
    ├── architecture/
    └── todo.md
```

### Penjelasan Struktur

**`compose.yaml` di root** – Mengikuti konvensi default Docker, sehingga perintah `docker compose up` dapat langsung dijalankan tanpa opsi tambahan.

**`compose.override.yaml` di root** – File ini akan otomatis digabung dengan `compose.yaml` jika berada di direktori yang sama. Ideal untuk konfigurasi development seperti mounting kode lokal atau mengekspos port tambahan.

**`.env` di root** – Digunakan untuk substitusi variabel di file Compose. Ini adalah mekanisme standar Docker untuk mengelola variabel lingkungan.

**Folder per service (`backend/`, `frontend/`)** – Setiap service memiliki direktori sendiri yang berisi kode sumber, Dockerfile, dan file dependensi. Pendekatan ini memudahkan pengelolaan dan skalabilitas.

**`docker/`** – Menampung artefak Docker tambahan seperti file override untuk production dan template environment.

**`data/`** – Untuk data persisten yang di-bind ke container. Pastikan folder ini masuk ke `.gitignore`.

**`docs/`** – Dokumentasi proyek, terpisah dari kode namun tetap dalam satu repositori.

---

## Kelebihan (Pros)

| Kelebihan | Penjelasan |
|-----------|------------|
| **Mengikuti konvensi Docker** | `compose.yaml` di root adalah perilaku default yang direkomendasikan secara resmi, sehingga developer baru langsung paham tanpa dokumentasi tambahan |
| **Pemisahan tanggung jawab yang jelas** | Setiap service memiliki direktori sendiri, kode terpisah dari konfigurasi Docker dan dokumentasi |
| **Multi-environment yang elegan** | Menggunakan file override (`compose.override.yaml` untuk dev, `compose.prod.yaml` untuk production) tanpa mengotori file utama |
| **Entry point terpusat** | `Makefile` di root menyederhanakan perintah-perintah umum seperti `make up`, `make build`, `make test` |
| **Portabilitas tinggi** | Seluruh environment dapat direplikasi di mesin mana pun dengan satu perintah |
| **Skalabel** | Struktur ini dapat diperluas untuk menambahkan service baru tanpa mengubah struktur dasar |

---

## Kekurangan (Cons)

| Kekurangan | Penjelasan |
|------------|------------|
| **Tidak mengikuti struktur framework tertentu** | Laravel, Django, atau Rails memiliki struktur baku. Memaksa semua kode masuk ke folder custom bisa membingungkan developer yang terbiasa dengan konvensi framework tersebut |
| **Risiko pada folder `data/`** | Jika tidak hati-hati menambahkan ke `.gitignore`, file database bisa ikut tercommit. Masalah permission juga sering muncul di Linux |
| **Root direktori bisa ramai** | Selain file Compose, ada `.env`, `.dockerignore`, `.gitignore`, `Makefile`, dan kemungkinan file konfigurasi lain yang dapat memenuhi root |
| **Dokumentasi terpisah dari kode** | Saat mengubah skema database di kode, dokumentasi di `docs/` sering terlupa diperbarui karena lokasinya terpisah |

---

## Contoh Penggunaan dengan Makefile

```makefile
# Makefile
.PHONY: up down build logs shell

up:
	docker compose up -d

up-prod:
	docker compose -f compose.yaml -f docker/compose.prod.yaml up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell:
	docker compose exec backend /bin/sh
```

Dengan struktur ini:
- `make up` → menjalankan `compose.yaml` + `compose.override.yaml` (untuk development)
- `make up-prod` → menjalankan dengan override production
- `make build` → membangun semua image

---

## Kesimpulan

Struktur proyek di atas menawarkan keseimbangan antara **kesederhanaan** dan **fleksibilitas**. Dengan mengikuti konvensi default Docker untuk `compose.yaml`, Anda meminimalkan kebutuhan dokumentasi tambahan dan memudahkan onboarding developer baru.

Untuk proyek sederhana, struktur ini sudah cukup. Untuk proyek yang lebih kompleks dengan banyak microservice, Anda dapat memperluasnya dengan menambahkan lebih banyak folder service dan memanfaatkan fitur `include` pada Compose.

Yang terpenting adalah **konsistensi**. Pilih satu struktur, dokumentasikan, dan pertahankan.