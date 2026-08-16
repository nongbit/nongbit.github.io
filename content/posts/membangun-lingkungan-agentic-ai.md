---
title: "Membangun Lingkungan Agentic AI"
date: 2026-08-15T08:00:00+07:00
draft: false
summary: "Panduan lengkap menyiapkan Agentic AI dengan Ollama dan VS Code, dari setup server hingga praktik penggunaan."
categories: ["teknologi", "agentic-ai", "ollama"]
tags: ["ai", "agentic", "ollama", "vscode", "developer-tools"]
---

# Membangun Lingkungan Agentic AI

Dokumen ini adalah panduan untuk menyiapkan **Agentic AI** — sebuah asisten pemrograman otonom yang dapat membaca file, menulis kode, menjalankan perintah terminal, dan membantu Anda memecahkan masalah pemrograman.

---

## Daftar Isi

1. [Pendahuluan: Apa Itu Agentic AI?](#1-pendahuluan-apa-itu-agentic-ai)
2. [Perbedaan Agentic AI dengan AI Biasa](#2-perbedaan-agentic-ai-dengan-ai-biasa)
3. [Spesifikasi Hardware dan Topologi Jaringan](#3-spesifikasi-hardware-dan-topologi-jaringan)
4. [Setup Server Debian Trixie](#4-setup-server-debian-trixie)
5. [Setup VS Code dan Ekstensi Agentic AI](#5-setup-vs-code-dan-ekstensi-agentic-ai)
6. [Memilih Framework Agentic AI (Tanpa Kode)](#6-memilih-framework-agentic-ai-tanpa-kode)
7. [Best Practices Agentic AI](#7-best-practices-agentic-ai)
8. [Contoh Penggunaan Agentic AI](#8-contoh-penggunaan-agentic-ai)
9. [Keamanan dan Perawatan](#9-keamanan-dan-perawatan)
10. [Ringkasan dan Status Akhir](#10-ringkasan-dan-status-akhir)

---

## 1. Pendahuluan: Apa Itu Agentic AI?

Agentic AI adalah sistem kecerdasan buatan yang **dapat bertindak secara otonom**, bukan hanya berbicara seperti chatbot biasa. Ia memiliki "otak" berupa Large Language Model (LLM) dan "tangan" berupa alat-alat (tools) yang dapat digunakannya untuk menyelesaikan tugas.

**Dalam konteks pengembangan perangkat lunak**, Agentic AI berperan sebagai **asisten pemrogram yang sangat cakap**. Anda bisa memberinya tugas seperti:

- "Buatkan class User dengan method getFullName"
- "Cari bug di file PaymentProcessor.php dan perbaiki"
- "Tulis unit test untuk semua method di OrderController"
- "Scan folder src/ dan temukan potensi masalah keamanan"

Agent akan menerima perintah Anda, merencanakan langkah-langkah, membaca file yang relevan, menulis kode, menjalankan perintah terminal, dan mengulangi siklus ini sampai tugas selesai.

**Yang akan kita bangun dalam panduan ini:**

```
┌──────────────────────────────────────────────────────────────┐
│                    LAPTOP KERJA ANDA                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               VS CODE + Ekstensi Agentic AI             │ │
│  │  - Anda mengetik perintah                               │ │
│  │  - Agent merespons dengan kode / solusi                 │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│                           │ HTTP (port 11434)                │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              SERVER (Mini PC / Debian Trixie)           │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  OLLAMA — Menjalankan model AI                     │ │ │
│  │  │  (qwen2.5-coder:7b)                                │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Perbedaan Agentic AI dengan AI Biasa

Agar pemahaman Anda utuh, berikut perbandingan fundamentalnya:

| Aspek | AI Biasa (Chatbot/LLM) | Agentic AI |
|-------|------------------------|------------|
| **Input** | Satu pertanyaan | Satu tujuan / tugas kompleks |
| **Proses** | Satu kali panggilan LLM | **Loop**: Reason → Act → Observe → Repeat |
| **Output** | Satu jawaban | Tujuan tercapai (kode jadi, bug fixed, dll) |
| **Kemampuan** | Hanya bicara | Bicara + pakai tools + ambil keputusan |
| **Contoh** | ChatGPT, Claude | Cline, Continue, OpenCursor, Talaria Code |

**Inti dari Agentic AI adalah Agent Loop:**

```
1. REASON: "Apa yang harus saya lakukan?"
2. DECIDE: "Saya perlu membaca file ini" → pilih tool read_file
3. ACT: Jalankan read_file
4. OBSERVE: Dapatkan hasilnya
5. Kembali ke step 1
6. FINISH: "Tugas selesai"
```

Dengan memahami perbedaan ini, Anda sekarang tahu bahwa panduan ini bukan tentang membuat chatbot, tetapi tentang **membangun sistem yang bisa bertindak**.

---

## 3. Spesifikasi Hardware dan Topologi Jaringan

### 3.1 Spesifikasi Minimal Server

Untuk menjalankan model AI 7B parameter secara nyaman:

| Komponen | Minimum | Direkomendasikan |
|----------|---------|------------------|
| CPU | Intel i5 / AMD Ryzen 5 (5 tahun terakhir) | Intel i7 / AMD Ryzen 7 |
| RAM | 16 GB | 32 GB |
| Storage | SSD 256 GB | SSD 512 GB NVMe |
| GPU | Tidak wajib (akan berjalan di CPU) | NVIDIA RTX 3060 (8GB VRAM) |

**Catatan tentang GPU**:
- Model 7B dapat berjalan di CPU dengan kecepatan 2-5 token/detik — cukup untuk development dan prototyping.
- Jika menggunakan GPU, kecepatan bisa mencapai 20-30 token/detik.

### 3.2 Opsi Mini PC sebagai Server Khusus

Jika laptop utama Anda tidak cukup kuat, gunakan **Mini PC** sebagai server AI terpisah. Jenis yang bisa dipakai:
- Intel NUC
- ASUS PN series
- Mini PC generic dengan spesifikasi di atas

**Keuntungan**:
- Beban komputasi tidak membebani laptop kerja
- Bisa diakses oleh tim (multiple developer)
- Bisa di-on-kan 24/7
- Harga lebih terjangkau daripada workstation penuh

### 3.3 Topologi Jaringan

Pastikan server dan laptop dalam satu jaringan (LAN/WiFi yang sama):

| Perangkat | IP (contoh) | Peran |
|-----------|-------------|-------|
| Server (Mini PC) | 192.168.1.20 | Menjalankan Ollama + model AI |
| Laptop Anda | 192.168.1.10 | VS Code + ekstensi agentic |

**Catatan**: Gunakan IP statis atau DHCP reservation agar alamat IP server tidak berubah-ubah.

---

## 4. Setup Server Debian Trixie

Bagian ini adalah inti dari infrastruktur. Ikuti langkah-langkah berikut secara berurutan di server Debian Trixie Anda.

### 4.1 Persiapan Dasar Server

```bash
# Login ke server
ssh root@192.168.1.20

# Update sistem
apt update && apt upgrade -y

# Install utilitas dasar
apt install -y curl wget git build-essential net-tools ufw
```

### 4.2 Install Ollama

Ollama adalah software yang menjalankan model AI di server.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama --version  # Verifikasi
```

### 4.3 Konfigurasi Ollama agar Bisa Diakses dari Laptop

Secara default, Ollama hanya mendengarkan di `localhost`. Kita ubah agar mendengarkan di semua antarmuka jaringan (`0.0.0.0`) sehingga laptop Anda bisa mengaksesnya.

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
sudo systemctl status ollama  # Cek status
```

### 4.4 Firewall

Batasi akses hanya dari laptop Anda. **Ini penting untuk keamanan.**

```bash
# Izinkan SSH (agar tidak terkunci)
ufw allow 22/tcp

# Izinkan akses Ollama hanya dari IP laptop Anda
ufw allow from 192.168.1.10 to any port 11434 proto tcp

# Aktifkan firewall
ufw enable
ufw status verbose
```

**Ganti `192.168.1.10` dengan IP laptop Anda yang sebenarnya.**

### 4.5 Download Model AI

Ini satu-satunya langkah yang butuh internet. Ukuran file ~4.5 GB. Waktu download 20-40 menit tergantung kecepatan internet.

```bash
ollama pull qwen2.5-coder:7b
```

**Alternatif model lain** (jika spesifikasi rendah):
- `qwen2.5-coder:1.5b` — lebih ringan, ukuran ~1 GB
- `deepseek-coder:6.7b` — alternatif dengan kualitas baik

### 4.6 Verifikasi Server

**Dari server sendiri**:
```bash
curl http://localhost:11434/api/tags
```

**Dari laptop Anda**:
```bash
curl http://192.168.1.20:11434/api/tags
```

Jika muncul daftar model (misal `qwen2.5-coder:7b`), server sudah siap.

---

## 5. Setup VS Code dan Ekstensi Agentic AI

### 5.1 Instal VS Code

VS Code gratis. Download dari [code.visualstudio.com](https://code.visualstudio.com).

### 5.2 Instal Ekstensi Agentic AI

Buka VS Code, tekan `Ctrl+Shift+X` (Windows/Linux) atau `Cmd+Shift+X` (Mac), cari dan instal **salah satu** ekstensi berikut. **Semua gratis dan open-source.**

| Ekstensi | Keunggulan | Kapan Pakai |
|----------|------------|-------------|
| **Cline** | Paling populer (5M+ installs), baca/tulis file, jalankan terminal, kontrol browser, MCP support | Ingin agent paling matang dan serbaguna |
| **Continue** | Inline autocomplete + chat, integrasi Ollama mudah | Ingin kombinasi chat dan autocomplete |
| **Talaria Code** | Agentic chat dengan RAG lokal, checkpoint, verifikasi model | Butuh RAG (konteks dari seluruh basis kode) |
| **OpenCursor** | Local-first, semantic search, 25 tools, offline mode | Butuh semantic search dan offline |
| **AgentCode** | Multi-model (100+ via LiteLLM), cost-aware routing | Ingin banyak pilihan model |

**Rekomendasi untuk pemula**: **Cline** atau **Continue**. Keduanya paling matang dan banyak dokumentasinya.

### 5.3 Konfigurasi Ekstensi

#### Untuk Cline:

1. Buka Cline sidebar (icon di sidebar kiri — biasanya bergambar robot/simbol)
2. Klik ikon gigi (Settings) di bagian bawah
3. Di bagian "Model Provider", pilih **Ollama**
4. Isi:
   - Base URL: `http://192.168.1.20:11434`
   - Model ID: `qwen2.5-coder:7b`
5. Simpan

#### Untuk Continue:

1. Tekan `Ctrl+Shift+P`
2. Ketik "Continue: Open Config"
3. Ganti isi file `config.json` dengan:

```json
{
  "models": [
    {
      "title": "Qwen 2.5 Coder 7B",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b",
      "apiBase": "http://192.168.1.20:11434"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen Autocomplete",
    "provider": "ollama",
    "model": "qwen2.5-coder:7b",
    "apiBase": "http://192.168.1.20:11434"
  },
  "allowAnonymousTelemetry": false
}
```

**Ganti `192.168.1.20` dengan IP server Anda yang sebenarnya.**

4. Save file (`Ctrl+S`)
5. Reload VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")

### 5.4 Cara Menggunakan

| Fitur | Cara Pakai |
|-------|------------|
| **Chat** | Buka panel Cline/Continue (icon di sidebar), tulis pertanyaan/tugas |
| **Autocomplete** | Mulai mengetik, saran muncul otomatis. Tekan `Tab` untuk menerima |
| **Edit Inline** | Sorot kode, tekan `Ctrl+I` (atau `Cmd+I` di Mac), beri instruksi |

### 5.5 Test Koneksi

1. Buka panel Cline atau Continue
2. Ketik: "Tulis fungsi Python untuk menghitung faktorial"
3. Tunggu respons

Jika muncul kode, **Agentic AI Anda sudah siap digunakan.**

---

## 6. Memilih Framework Agentic AI (Tanpa Kode)

Anda tidak perlu menulis agent dari nol. Ada banyak framework open-source yang sangat matang dan siap pakai. Berikut perbandingan framework terbaik di 2026:

| Framework | Bahasa | Keunggulan | Kapan Pakai |
|-----------|--------|------------|-------------|
| **LangGraph** | Python | Stateful, graph-based, checkpointing, production-ready | Butuh kontrol presisi dan state management |
| **CrewAI** | Python | Role-based multi-agent, mudah dipahami, cepat | Rapid prototyping, multi-agent role-based |
| **Microsoft Agent Framework** | Python/.NET | Pengganti AutoGen, enterprise, Azure integration | Tim Microsoft stack, migrasi dari AutoGen |
| **LlamaIndex** | Python | RAG, document-heavy, pipelines | Banyak data dokumen yang perlu diolah |
| **OpenAI Agents SDK** | Python | Minimalis, tool-calling, delegasi | Ekosistem OpenAI, project sederhana |
| **Mastra** | TypeScript | Native JavaScript/TypeScript | Tim JavaScript/TypeScript |
| **Google ADK** | Python | GCP-native, Vertex AI integration | GCP stack |

**Rekomendasi utama**:
- Untuk **production complex**: LangGraph
- Untuk **prototyping cepat**: CrewAI
- Untuk **tim TypeScript**: Mastra

**Catatan penting**: AutoGen (Microsoft Research) sudah masuk **maintenance mode** sejak Oktober 2025 — hanya perbaikan bug, tidak ada fitur baru. Untuk project baru, jangan pakai AutoGen. Gunakan Microsoft Agent Framework sebagai penggantinya.

---

## 7. Best Practices Agentic AI

Berikut adalah praktik terbaik yang perlu Anda terapkan, baik saat menggunakan agentic AI di VS Code maupun jika suatu saat Anda membangun agent sendiri:

### 7.1 Tool-First Design

Jangan mulai dengan menulis prompt. Mulailah dengan mendefinisikan **tools** (kemampuan) yang dimiliki agent.

```python
# BURUK: Mulai dengan prompt
prompt = "You are an assistant..."

# BAIK: Definisikan tools dulu
def read_file(path): ...
def write_file(path, content): ...
```

### 7.2 Guardrails — Wajib!

Agentic AI bisa "kebablasan". Pasang batasan:
- `max_iterations = 10` — mencegah infinite loop
- `max_tokens = 4096` — batas output
- `allowed_tools = [...]` — whitelist tools

### 7.3 Observability

**Setiap langkah agent harus terlihat.** Log semua keputusan:
- Iterasi ke berapa
- Tool apa yang dipanggil
- Hasil tool apa

### 7.4 Externalized Prompts

Prompt adalah kode. Simpan di file terpisah, di version control.

### 7.5 Pure-Function Tools

Tools harus deterministik — tidak ada side effect yang tidak terduga.

### 7.6 Human-in-the-Loop

Untuk tindakan berisiko (menjalankan perintah terminal, menghapus file), agent harus meminta persetujuan Anda.

---

## 8. Contoh Penggunaan Agentic AI

Berikut beberapa contoh prompt yang bisa Anda berikan ke Agentic AI setelah semua setup selesai. Porsi contoh ini sengaja dibuat singkat — fokus utama panduan ini adalah infrastruktur.

### 8.1 "Scan folder ini dan temukan potensi masalah"

```
Scan folder src/ dan temukan potensi masalah keamanan atau bug.
```

**Apa yang dilakukan agent**:
1. Membaca semua file di folder `src/`
2. Menganalisis kode
3. Menemukan masalah seperti SQL injection, XSS vulnerability, unused variables

### 8.2 "Kenapa muncul error ini?"

```
Saya dapat error: "TypeError: Cannot read property 'map' of undefined" di file UserList.js line 45. Tolong cari penyebabnya.
```

**Apa yang dilakukan agent**:
1. Membaca file `UserList.js`
2. Melihat line 45
3. Menganalisis konteks
4. Menemukan bahwa `users` undefined
5. Memberikan solusi

### 8.3 "Bantu debug aplikasi"

```
Aplikasi saya crash saat submit form. Tolong bantu debug.
```

**Apa yang dilakukan agent**:
1. Membaca file-file terkait (controller, model, view)
2. Menganalisis alur data
3. Menemukan kemungkinan penyebab
4. Memberikan saran perbaikan

### 8.4 "Tulis unit test"

```
Tulis unit test untuk fungsi calculateTotal di file Cart.js
```

**Apa yang dilakukan agent**:
1. Membaca file `Cart.js`
2. Memahami fungsi `calculateTotal`
3. Menulis file test dengan berbagai skenario

---

## 9. Keamanan dan Perawatan

| Aspek | Panduan |
|-------|---------|
| **Privasi kode** | Kode tidak pernah meninggalkan server Anda — 100% lokal |
| **Biaya** | Semua alat gratis dan open-source — tidak ada langganan |
| **Internet** | Setelah model di-download, bisa digunakan tanpa internet |
| **Persetujuan** | Setiap perubahan file dan perintah terminal memerlukan persetujuan Anda (di Cline/Continue) |
| **Firewall** | Port 11434 hanya boleh diakses dari IP laptop Anda |
| **Update model** | `ollama pull qwen2.5-coder:latest` untuk versi terbaru |

**Perintah penting**:
```bash
# Cek model terinstall
ollama list

# Hapus model yang tidak dipakai
ollama rm nama_model

# Update model
ollama pull qwen2.5-coder:latest
```

---

## 10. Ringkasan dan Status Akhir

Anda sekarang telah menyelesaikan seluruh rangkaian setup. Berikut status akhir Anda:

| Komponen | Status | Keterangan |
|----------|--------|------------|
| Server Debian Trixie | Siap | Bisa berupa Mini PC |
| Ollama terinstall | Siap | `ollama --version` |
| Model AI (qwen2.5-coder:7b) | Siap | `ollama list` |
| Firewall terkonfigurasi | Siap | Hanya IP laptop yang bisa akses |
| VS Code terinstall | Siap | Download dari situs resmi |
| Ekstensi Agentic AI (Cline/Continue) | Siap | Terinstal dan terkonfigurasi |
| Koneksi ke server terverifikasi | Siap | `curl http://IP:11434/api/tags` |
| Test chat berhasil | Siap | Muncul respons dari model |

**Agentic AI Anda sudah siap digunakan.**

Buka VS Code, buka panel Cline atau Continue, dan mulai berinteraksi. Tidak perlu menulis kode agent apapun — semuanya sudah diatur melalui ekstensi.
