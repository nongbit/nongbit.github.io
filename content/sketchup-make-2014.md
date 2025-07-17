---
title: "SketchUp Make 2014"
date: 2025-07-17T08:00:00+07:00
draft: false
summary: "Solusi SketchUp untuk orang medit."
categories: ["software"]
---

Meski sehari-hari menggunakan Linux tapi saya juga masih membutuhkan Windows dan selama ini Windows XP yang dipasang di atas VirtualBox sudah cukup. Beberapa software penting masih bisa dijalankan meski membutuhkan usaha ekstra untuk mencari rilis yang cocok. Termasuk untuk SketchUp. SketchUp desktop jadi pilihan karena saya tidak terlalu cocok dengan solusi online.

## Menjalankan Windows XP Melalui VirtualBox

Alih-alih memasang Windows XP dari awal, kita bisa menggunakan file image berformat .vdi. Berikut langkah-langkahnya:

1. Unduh file .vdi Windows XP SP3 dari sumber terpercaya seperti [Internet Archive](https://archive.org/details/xp51_20191108).
2. Buka VirtualBox dan buat mesin virtual baru dengan pengaturan:
   - Sistem operasi: Windows XP (32-bit)
   - RAM: 1024 – 1536 MB
   - Core CPU: 1 – 2
3. Pada bagian *Storage*, pasang file .vdi sebagai *Hard Disk* utama.
4. Jalankan mesin virtual, dan Windows XP akan aktif tanpa proses instalasi manual.

## Versi SketchUp yang Mendukung Windows XP

Versi gratis terakhir yang kompatibel dengan Windows XP 32 bit adalah [SketchUp Make 2014](https://web.archive.org/web/20150522031210/http://dl.trimble.com/sketchup/2014/en/SketchUpMake-2014-1-1282-61130-en.exe). Versi ini dapat digunakan untuk keperluan pribadi atau edukatif, namun tidak diperuntukkan bagi penggunaan komersial.

### Fitur utama SketchUp Make 2014

- Antarmuka ringan dan mudah digunakan
- Mendukung plugin eksternal melalui Extension Warehouse
- Cocok untuk desain arsitektur, interior, dan teknik dasar
- Format file utama: .skp versi 2014 atau lebih rendah

## Persyaratan Sistem: Instalasi .NET Framework 4.0

SketchUp Make 2014 memerlukan .NET Framework 4.0 agar dapat berjalan dengan baik. Kita perlu mengunduh dan memasangnya terlebih dahulu.

### Langkah pemasangan

1. Unduh Microsoft .NET Framework 4.0 (Offline Installer) dari [situs resmi Microsoft](https://www.microsoft.com/en-us/download/details.aspx?id=17718).
2. Jalankan instalasi di mesin virtual Windows XP.
3. Restart sistem jika diminta setelah instalasi selesai.

## Mengunduh Komponen dari Marketplace

SketchUp Make 2014 tetap mendukung pengunduhan komponen dari marketplace seperti 3D Warehouse, selama format file kompatibel dengan versi SketchUp yang digunakan.

### Format komponen yang kompatibel

- .skp versi 2014 atau lebih rendah
- .dae (COLLADA), dengan import melalui menu File → Import

Jika komponen berasal dari versi SketchUp yang lebih baru, kita bisa membuka dan menyimpannya ulang menggunakan versi terbaru lalu memilih format SketchUp 2014 saat ekspor.