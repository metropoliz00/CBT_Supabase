# PANDUAN DEPLOY APLIKASI CBT TKA DI HOSTING CPANEL

Aplikasi **CBT TKA System** ini telah dioptimalkan untuk dapat berjalan dengan sangat mudah di semua jenis hosting **cPanel** (Shared Hosting, Cloud Hosting, VPS, maupun Dedicated Server).

---

## 📋 PERSIAPAN UTAMA (DATABASE SUPABASE)

Sebelum mengunggah file ke cPanel, pastikan database Supabase Anda sudah siap:
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) -> pilih proyek Anda.
2. Masuk ke menu **SQL Editor** -> klik **New query**.
3. Buka file `supabase-schema.sql` yang ada di root proyek ini, salin seluruh isinya, lalu tempelkan ke SQL Editor Supabase.
4. Klik tombol **Run** untuk membuat semua tabel, RLS, index, dan akun admin default (`admin` / `admin123`).

---

## 🚀 METODE 1: DEPLOY TERCEPAT & TERMUDAH (STATIC SPA - DIREKOMENDASIKAN)

Metode ini bekerja di **semua jenis cPanel** (termasuk cPanel Shared Hosting standar tanpa fitur Node.js). Aplikasi akan di-*build* menjadi file HTML, CSS, dan JavaScript statis yang sangat cepat.

### Langkah-langkah:
1. **Build Aplikasi di Komputer Lokal / AI Studio**:
   Jalankan perintah berikut di terminal:
   ```bash
   npm run build
   ```
   *Perintah ini akan menghasilkan folder **`dist/`** yang berisi file `index.html`, `.htaccess`, dan folder `assets/`.*

2. **Buka File Manager di cPanel**:
   - Login ke cPanel Anda.
   - Buka menu **File Manager** (Manajer Berkas).
   - Masuk ke direktori **`public_html`** (atau folder subdomain Anda, misal `cbt.domainanda.com`).

3. **Unggah File dari Folder `dist`**:
   - Kompres seluruh isi di **dalam** folder `dist/` menjadi file ZIP (misal: `dist.zip`).
   - Unggah `dist.zip` ke folder `public_html` di cPanel.
   - Ekstrak file `dist.zip` tersebut di dalam `public_html`.
   - Pastikan file `.htaccess` juga terikut (jika tersembunyi di File Manager cPanel, aktifkan centang **"Show Hidden Files (dotfiles)"** di menu Settings File Manager kanan atas).

4. **Selesai!**:
   Buka domain Anda di browser (`https://domainanda.com`). Aplikasi CBT TKA siap digunakan!

---

## ⚙️ METODE 2: DEPLOY NODE.JS APP DI CPANEL (OPTIONAL)

Gunakan metode ini jika cPanel Anda memiliki fitur **Setup Node.js App** (biasanya di CloudLinux/LiteSpeed) dan Anda ingin menjalankan backend Express proxy secara aktif.

### Langkah-langkah:
1. **Jalankan Build**:
   ```bash
   npm run build
   ```
2. **Buat Aplikasi Node.js di cPanel**:
   - Login ke cPanel -> pilih menu **Setup Node.js App**.
   - Klik **Create Application**.
   - **Node.js Version**: Pilih v18.x, v20.x, atau versi LTS terbaru.
   - **Application Mode**: Pilih `Production`.
   - **Application Root**: `cbt-app` (atau nama folder yang diinginkan).
   - **Application URL**: Pilih domain / subdomain Anda.
   - **Application Startup File**: `dist/server.cjs`
   - Klik **Create**.

3. **Unggah File Proyek**:
   - Unggah seluruh folder proyek (termasuk `package.json`, `dist/`, `supabase-schema.sql`) ke direktori `cbt-app`.
   - Buka menu **Setup Node.js App** di cPanel, lalu klik tombol **Run NPM Install**.
   - Klik **Restart Application**.

---

## 🔧 PENYELESAIAN MASALAH (TROUBLESHOOTING)

- **Masalah 404 saat Refresh Halaman di Sub-Route**:
  Pastikan file `.htaccess` sudah ada di `public_html`. File `.htaccess` bawaan proyek ini sudah dikonfigurasi untuk menangani React Router SPA redirect.

- **Koneksi Supabase Error / Gagal Dimuat**:
  Pastikan skrip `supabase-schema.sql` sudah sukses dijalankan di SQL Editor Supabase Anda.

---
*Dikembangkan oleh MeyGa Team Computer Based Test System*
