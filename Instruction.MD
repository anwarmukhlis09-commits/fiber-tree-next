# Panduan Integrasi Next.js dengan Capacitor (Android/iOS)

Dokumen ini berisi rangkuman seluruh langkah yang telah kita lakukan untuk mengubah project web Next.js menjadi aplikasi *mobile* (Android/iOS) menggunakan Capacitor, termasuk perbaikan *error* yang sering terjadi. Anda dapat menggunakan panduan ini untuk project serupa di masa depan.

---

## 1. Konfigurasi Next.js
Pastikan pengaturan Next.js Anda benar sebelum di-*build*.

- Buka `next.config.ts` (atau `.js`).
- Pastikan menggunakan `output: 'export'` untuk menghasilkan file statis HTML/JS/CSS murni.
- **Jangan gunakan** `basePath` atau `assetPrefix` (seperti `/nama-project`) kecuali Anda tahu apa yang Anda lakukan, karena ini sering menyebabkan aplikasi menjadi *blank* (putih) atau *error 404* saat dibuka di mobile.
- Jika Anda melakukan testing menggunakan jaringan lokal (LAN/WiFi IP), tambahkan IP Anda ke `allowedDevOrigins` untuk mencegah pemblokiran CORS dari sistem keamanan Next.js 15+:
  ```typescript
  const nextConfig: NextConfig = {
    output: 'export',
    images: { unoptimized: true },
    allowedDevOrigins: ['192.168.56.1', '192.168.56.1:3000', 'localhost'],
  };
  export default nextConfig;
  ```

---

## 2. Menambahkan Capacitor ke Project Existing
**Jangan** menggunakan `npm init @capacitor/app` jika Anda sudah punya project Next.js, karena itu akan membuat project kosong dari awal.

Lakukan urutan ini di root direktori project Next.js Anda:
1. Instal inti Capacitor:
   ```bash
   npm install @capacitor/core
   ```
2. Instal Capacitor CLI untuk development:
   ```bash
   npm install -D @capacitor/cli
   ```
3. Inisialisasi Capacitor:
   ```bash
   npx cap init
   ```
   - *App Name*: Nama aplikasi Anda (contoh: Fiber Optic Calculator).
   - *App Package ID*: ID unik aplikasi Anda (contoh: com.bagus.fibercalc).
   - *Web Asset Directory*: **WAJIB DIISI `out`** (karena Next.js mengekspor hasil build ke folder `out`).

---

## 3. Build & Tambah Platform (Android / iOS)
Sebelum menambahkan platform, Anda **wajib** melakukan proses *build* aplikasi web Anda agar folder `out` tercipta.

1. Build Next.js:
   ```bash
   npm run build
   ```
2. Instal pustaka platform Android dan iOS:
   ```bash
   npm install @capacitor/android @capacitor/ios
   ```
3. Tambahkan platform ke dalam project:
   ```bash
   npx cap add android
   npx cap add ios
   ```
4. Sinkronisasi (Kopi file web dari folder `out` ke platform native):
   ```bash
   npx cap sync
   ```
   *(Catatan: Langkah 1 dan 4 harus selalu Anda jalankan berurutan setiap kali Anda mengubah kode UI Next.js Anda).*

---

## 4. Solusi Error SDK / Gradle di Android
Jika Anda menjumpai *error* seperti `SDK location not found` saat menjalankan Gradle/Android Studio, artinya sistem tidak mendeteksi lokasi Android SDK Anda.

Solusi cepatnya:
1. Buka folder `android/` di dalam project Anda.
2. Buat file bernama `local.properties`.
3. Isi dengan lokasi SDK Windows Anda (ingat, gunakan tanda *backslash* ganda `\\`):
   ```properties
   sdk.dir=C:\\Users\\Bagus\\AppData\\Local\\Android\\Sdk
   ```

---

## 5. Membuat Ikon Aplikasi dan Splash Screen Secara Otomatis
Alih-alih menyalin ikon secara manual ke berbagai folder ukuran resolusi layar, Capacitor menyediakan alat generator otomatis bernama `@capacitor/assets`.

1. Buat folder bernama `assets` di root direktori project Anda.
2. Siapkan **1 file gambar besar beresolusi tinggi** (contoh: 1024x1024 ke atas).
3. Salin/kopi gambar tersebut ke dalam folder `assets` dan beri nama file menjadi `icon.png` (untuk ikon aplikasi) dan `splash.png` (untuk splash screen saat memuat).
4. Instal plugin generator:
   ```bash
   npm install -D @capacitor/assets
   ```
5. Jalankan generator:
   ```bash
   npx capacitor-assets generate
   ```
   Perintah ini akan secara otomatis memotong, menyesuaikan resolusi, dan membagikan seluruh gambar tersebut ke folder platform Android dan iOS Anda dengan tepat.

---

## 6. Menjalankan Aplikasi
Buka dan jalankan aplikasi secara langsung (pastikan Emulator atau perangkat asli telah terhubung):

- Untuk Android: `npx cap run android` (atau `npx cap open android` untuk membuka via IDE Android Studio).
- Untuk iOS: `npx cap run ios` (Hanya bisa dilakukan di perangkat macOS).
