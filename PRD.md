# 📋 Product Requirements Document (PRD)
## Sistem Presensi Digital Magang — KAI Daop 8 Unit Operasi

**Versi:** 3.0
**Tanggal:** 31 Agustus 2026
**Disusun oleh:** Tim Magang KAI Daop 8 Unit Operasi
**Status:** Draft Final

---

## 1. Latar Belakang

Sistem presensi saat ini berjalan via Google Form (2 link terpisah) dengan Google Spreadsheet sebagai database.
Tujuan: membangun **web terpadu** yang menggantikan Google Form, tanpa mengubah data Spreadsheet yang sudah ada.

**Sheet yang sudah aktif:**
| Sheet | Fungsi |
|-------|--------|
| `Form Responses 1` | Respons Google Form lama |
| `Data Registrasi` | Master data peserta |
| `Data Sheet` | Presensi harian per peserta |

---

## 2. Tech Stack (Keputusan Akhir)

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND                                           │
│  Vite + React (JavaScript)                          │
│  - React Router v6  → navigasi halaman             │
│  - Axios / Fetch    → panggil API                  │
│  - TailwindCSS      → styling cepat                │
│  - React Webcam     → ambil foto presensi          │
│  Host: GitHub Pages / Vercel (GRATIS)               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS POST/GET (JSON)
                       ▼
┌─────────────────────────────────────────────────────┐
│  BACKEND                                            │
│  Google Apps Script (GAS) — Web App                 │
│  - Ditulis pakai JavaScript (GAS dialect)           │
│  - Dipublish sebagai Web App URL publik             │
│  - Fungsi: doGet() & doPost()                       │
│  - Gratis, serverless, auto-scale                   │
│  URL contoh:                                        │
│  https://script.google.com/macros/s/[ID]/exec       │
└──────────────────────┬──────────────────────────────┘
                       │ SpreadsheetApp API
                       ▼
┌─────────────────────────────────────────────────────┐
│  DATABASE                                           │
│  Google Spreadsheet (yang SUDAH ADA)                │
│  + Sheet baru: Lokasi, Izin, Admin                  │
└──────────────────────┬──────────────────────────────┘
                       │ DriveApp API
                       ▼
┌─────────────────────────────────────────────────────┐
│  STORAGE FOTO                                       │
│  Google Drive (folder presensi yang sudah ada)      │
└─────────────────────────────────────────────────────┘
```

---

## 3. Bagaimana Frontend Terkoneksi ke Google Spreadsheet

### Alur Koneksi (Step by Step)

```
React App                    Apps Script                  Google Sheets
   │                              │                             │
   │  1. User klik "Presensi"     │                             │
   │                              │                             │
   │  2. fetch POST ke            │                             │
   │     GAS Web App URL ──────►  │                             │
   │     (JSON: nama, foto,       │  3. GAS baca/tulis          │
   │      GPS, action)            │     SpreadsheetApp ──────►  │
   │                              │                             │
   │                              │  4. Sheets update ◄──────  │
   │                              │                             │
   │  5. GAS kirim response ◄───  │                             │
   │     (JSON: status, data)     │                             │
   │                              │                             │
   │  6. React update UI          │                             │
```

### Cara Kerja Koneksi (Teknis)

**Di React (frontend) — `src/services/api.js`:**
```js
// URL Apps Script disimpan di .env
const GAS_URL = import.meta.env.VITE_GAS_URL;

// Contoh: Login
export async function login(nama, tanggalLahir) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // GAS perlu text/plain
    body: JSON.stringify({
      action: 'login',
      nama: nama,
      tanggalLahir: tanggalLahir  // format: "1999-08-15"
    })
  });
  return await res.json();
}

// Contoh: Presensi Masuk
export async function checkIn(idPeserta, foto64, lat, long) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'checkIn',
      idPeserta: idPeserta,
      foto: foto64,      // base64 string dari webcam
      latitude: lat,
      longitude: long,
      timestamp: new Date().toISOString()
    })
  });
  return await res.json();
}
```

**Di Apps Script (backend) — `Code.gs`:**
```js
// Entry point utama - semua request masuk sini
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  let result;

  switch(action) {
    case 'login':       result = handleLogin(data); break;
    case 'daftar':      result = handleDaftar(data); break;
    case 'checkIn':     result = handleCheckIn(data); break;
    case 'checkOut':    result = handleCheckOut(data); break;
    case 'getRiwayat':  result = handleGetRiwayat(data); break;
    case 'ajukanIzin':  result = handleAjukanIzin(data); break;
    // Admin actions
    case 'approveUser': result = handleApproveUser(data); break;
    case 'rejectUser':  result = handleRejectUser(data); break;
    case 'approveIzin': result = handleApproveIzin(data); break;
    case 'getDashboard':result = handleGetDashboard(data); break;
    default:
      result = { success: false, message: 'Action tidak dikenal' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 4. Endpoint API (Apps Script Actions)

Semua request ke satu URL GAS, dibedakan via field `action`:

### Auth & Registrasi
| Action | Method | Deskripsi | Input | Output |
|--------|--------|-----------|-------|--------|
| `getPesertaList` | GET | Ambil daftar nama untuk autocomplete login | — | `[{id, nama}]` |
| `login` | POST | Verifikasi login peserta | `nama, tanggalLahir` | `{success, user, role}` |
| `daftar` | POST | Daftar peserta baru | `nama, tglLahir, alamat, hp, email, kampus, jurusan, mulai, selesai, foto64` | `{success, message}` |

### Presensi
| Action | Method | Deskripsi | Input | Output |
|--------|--------|-----------|-------|--------|
| `getStatusHariIni` | POST | Cek sudah check-in/out hari ini | `idPeserta` | `{sudahMasuk, sudahPulang, jamMasuk, jamPulang}` |
| `checkIn` | POST | Simpan presensi masuk | `idPeserta, foto64, lat, long, timestamp` | `{success, jamMasuk}` |
| `checkOut` | POST | Simpan presensi pulang | `idPeserta, foto64, lat, long, timestamp` | `{success, jamPulang, totalMenit}` |
| `getRiwayat` | POST | Ambil riwayat presensi peserta | `idPeserta, dari, sampai` | `[{tgl, lokasi, masuk, pulang, totalJam, status, fotoMasuk, fotoPulang}]` |

### Izin
| Action | Method | Deskripsi | Input | Output |
|--------|--------|-----------|-------|--------|
| `ajukanIzin` | POST | Kirim pengajuan izin | `idPeserta, tanggal, jenis, keterangan, bukti64` | `{success, idIzin}` |
| `getIzinSaya` | POST | Riwayat izin peserta | `idPeserta` | `[{tanggal, jenis, status}]` |

### Admin
| Action | Method | Deskripsi | Input | Output |
|--------|--------|-----------|-------|--------|
| `getDashboardAdmin` | POST | Rekap presensi hari ini | `adminToken` | `{hadir, izin, tidakHadir, pending}` |
| `getPendingUsers` | POST | List peserta menunggu approval | `adminToken` | `[{id, nama, kampus, ...}]` |
| `approveUser` | POST | Setujui peserta + tetapkan lokasi | `adminToken, idPeserta, idLokasi` | `{success}` |
| `rejectUser` | POST | Tolak peserta | `adminToken, idPeserta, alasan` | `{success}` |
| `getAllPresensi` | POST | Semua presensi untuk rekap | `adminToken, tanggal` | `[{nama, lokasi, masuk, pulang}]` |
| `getPendingIzin` | POST | List izin menunggu approval | `adminToken` | `[{id, nama, tanggal, jenis}]` |
| `approveIzin` | POST | Setujui izin | `adminToken, idIzin` | `{success}` |
| `rejectIzin` | POST | Tolak izin + catatan | `adminToken, idIzin, catatan` | `{success}` |
| `getLokasi` | POST | Daftar semua lokasi | `adminToken` | `[{id, nama, lat, long, radius}]` |
| `addLokasi` | POST | Tambah lokasi baru | `adminToken, nama, lat, long, radius` | `{success}` |

---

## 5. Struktur Project React (Vite)

```
presensi-kai-daop8/
│
├── .env                          # VITE_GAS_URL=https://script.google.com/...
├── index.html
├── vite.config.js
├── package.json
│
├── public/
│   └── logo-kai.png
│
└── src/
    ├── main.jsx                  # Entry point
    ├── App.jsx                   # Router utama
    │
    ├── services/
    │   └── api.js                # Semua fungsi fetch ke GAS
    │
    ├── context/
    │   └── AuthContext.jsx       # State login global (useContext)
    │
    ├── hooks/
    │   ├── useGeolocation.js     # GPS hook
    │   └── useCamera.js          # Webcam hook
    │
    ├── pages/
    │   ├── Landing.jsx           # Halaman awal
    │   ├── Login.jsx             # Login nama + tgl lahir
    │   ├── Register.jsx          # Form pendaftaran
    │   ├── WaitingApproval.jsx   # Menunggu persetujuan
    │   │
    │   ├── intern/               # Halaman khusus role intern
    │   │   ├── Dashboard.jsx     # Dashboard + tombol presensi
    │   │   ├── CheckIn.jsx       # Flow foto + GPS + submit masuk
    │   │   ├── CheckOut.jsx      # Flow foto + GPS + submit pulang
    │   │   ├── Riwayat.jsx       # Tabel riwayat presensi
    │   │   └── Izin.jsx          # Form & riwayat izin
    │   │
    │   └── admin/                # Halaman khusus role admin
    │       ├── Dashboard.jsx     # Rekap & statistik
    │       ├── Approval.jsx      # Approve/reject pendaftar
    │       ├── Peserta.jsx       # Kelola semua peserta
    │       ├── Lokasi.jsx        # Kelola titik geofencing
    │       └── Izin.jsx          # Approve/reject izin
    │
    └── components/
        ├── Navbar.jsx
        ├── CameraCapture.jsx     # Komponen kamera (react-webcam)
        ├── LocationChecker.jsx   # Komponen cek GPS & geofence
        ├── PresenceCard.jsx      # Kartu status hari ini
        ├── HistoryTable.jsx      # Tabel riwayat presensi
        └── AdminCard.jsx         # Kartu statistik admin
```

---

## 6. Environment Variables

File `.env` di root project:
```env
# URL Google Apps Script Web App (ganti setelah deploy GAS)
VITE_GAS_URL=https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec

# ID Spreadsheet KAI Daop 8 (ada di URL Spreadsheet)
VITE_SPREADSHEET_ID=1GrYg3gDKSdfc8i2mTcbDFpbvci7...

# Radius geofencing default (meter)
VITE_GEOFENCE_RADIUS=100
```

---

## 7. Cara Deploy Google Apps Script

### Langkah Setup Backend (Sekali Setup):

1. **Buka Spreadsheet** → klik `Ekstensi` → `Apps Script`
2. **Buat file `Code.gs`** → isi dengan kode backend (disediakan saat development)
3. **Klik Deploy** → `New deployment`
   - Type: `Web App`
   - Execute as: `Me (email Google)`
   - Who has access: `Anyone` ✅ (agar frontend bisa akses)
4. **Copy URL** yang muncul → paste ke `.env` React sebagai `VITE_GAS_URL`
5. Setiap ada update kode GAS → **Deploy baru** → URL bisa sama (pakai versi)

### Cara Deploy Frontend (React + Vite):

```bash
# Install dependencies
npm install

# Development (lokal)
npm run dev

# Build production
npm run build

# Deploy ke GitHub Pages
npm run deploy    # (perlu konfigurasi gh-pages)
```

---

## 8. Struktur Sheet Lengkap

### Sheet `Data Registrasi` (Sudah Ada + Tambahan)
| # | Kolom | Tipe | Status |
|---|-------|------|--------|
| A | Timestamp Submit | Datetime | ✅ Ada |
| B | Nama Lengkap | Text | ✅ Ada |
| C | Tanggal Lahir | DD/MM/YYYY | ✅ Ada |
| D | Alamat | Text | ✅ Ada |
| E | No HP | Text | ✅ Ada |
| F | Email | Text | ✅ Ada |
| G | Kampus | Text | ✅ Ada |
| H | Jurusan | Text | ✅ Ada |
| I | Tanggal Mulai | Date | ✅ Ada |
| J | Tanggal Selesai | Date | ✅ Ada |
| K | Foto Profil URL | URL | ✅ Ada |
| L | **Status Akun** | pending/active/rejected | 🆕 Baru |
| M | **Role** | intern/admin | 🆕 Baru |
| N | **ID Lokasi** | Text (FK) | 🆕 Baru |
| O | **ID Unik** | MGGNG-001 | 🆕 Baru |

### Sheet `Data Sheet` per peserta (Sudah Ada + Tambahan)
| # | Kolom | Tipe | Status |
|---|-------|------|--------|
| A | NO | Number | ✅ Ada |
| B | TANGGAL | DD/MM/YYYY | ✅ Ada |
| C | LOKASI | Text | ✅ Ada |
| D | TIMESTAMP DATANG | HH:MM:SS | ✅ Ada |
| E | DOKUMENTASI DATANG | URL/Foto | ✅ Ada |
| F | TIMESTAMP PULANG | HH:MM:SS | ✅ Ada |
| G | DOKUMENTASI PULANG | URL/Foto | ✅ Ada |
| H | **TOTAL JAM** | Text (Xj Ym) | 🆕 Baru |
| I | **GPS DATANG** | lat,long | 🆕 Baru |
| J | **GPS PULANG** | lat,long | 🆕 Baru |
| K | **STATUS** | Hadir/Izin/Alfa | 🆕 Baru |

### Sheet `Lokasi` (Baru)
| Kolom | Contoh |
|-------|--------|
| ID | LOK-001 |
| Nama Lokasi | KANTOR DAOP |
| Alamat | Jl. Gubeng Masjid No.1, Surabaya |
| Latitude | -7.257472 |
| Longitude | 112.752088 |
| Radius (meter) | 100 |
| Status | aktif |

### Sheet `Izin` (Baru)
| Kolom | Tipe |
|-------|------|
| ID Izin | Auto |
| ID Peserta | FK |
| Nama | Text |
| Tanggal Izin | Date |
| Jenis | Sakit/Mendesak/Dinas/Lainnya |
| Keterangan | Text |
| Bukti URL | URL |
| Status | pending/approved/rejected |
| Catatan Admin | Text |
| Diproses Oleh | Nama admin |
| Waktu Submit | Datetime |

---

## 9. Alur Kerja Lengkap

### 9.1 Registrasi
```
User isi form (React) → POST ke GAS (action: daftar)
→ GAS tambah baris ke sheet "Data Registrasi" (status: pending)
→ Admin buka web → lihat list pending → klik Approve
→ GAS update status → active, tambah kolom Role & Lokasi
→ GAS buat tab Data Sheet baru untuk peserta ini
```

### 9.2 Login
```
User pilih nama → input tgl lahir → POST ke GAS (action: login)
→ GAS cari di sheet "Data Registrasi" (cocokkan nama + tgl lahir)
→ Jika cocok: return {success, idPeserta, nama, role, lokasi}
→ React simpan ke localStorage (session)
→ Redirect ke /dashboard (intern atau admin sesuai role)
```

### 9.3 Presensi Masuk
```
User klik "Presensi Masuk"
→ React minta GPS (navigator.geolocation)
→ React hitung jarak ke koordinat lokasi penugasan
→ Jika dalam radius (default 100m):
    → Buka kamera (react-webcam)
    → User foto selfie → preview
    → Klik konfirmasi
    → POST ke GAS (action: checkIn, foto base64, GPS, timestamp)
    → GAS upload foto ke Google Drive (DriveApp)
    → GAS tulis ke sheet "Data Sheet" peserta (baris baru)
    → Return {success, jamMasuk}
    → React update UI dashboard
→ Jika di luar radius:
    → Tampilkan modal "Di luar area"
    → Tombol "Ajukan Izin"
```

### 9.4 Presensi Pulang
```
(Sama seperti masuk, tapi action: checkOut)
→ GAS update baris hari ini (isi kolom Pulang)
→ GAS hitung total menit: (jamPulang - jamMasuk)
→ Update kolom TOTAL JAM dan STATUS = "Hadir"
```

---

## 10. Keamanan

| Aspek | Implementasi |
|-------|-------------|
| Sesi | Token unik (UUID) di localStorage, expire 8 jam |
| API Token | Setiap request kirim session token, GAS validasi |
| Admin Token | Token berbeda & lebih kuat untuk aksi admin |
| GPS | Validasi radius dilakukan di GAS (server-side), bukan hanya client |
| Foto | Di-upload ke Drive private, URL hanya valid via GAS |
| Rate limit | GAS cek: 1 checkIn + 1 checkOut per peserta per hari |

---

## 11. Milestone & Pembagian Pekerjaan

| Fase | Pekerjaan | Tools | Estimasi |
|------|-----------|-------|----------|
| **1** | Setup GAS + koneksi Spreadsheet, buat semua endpoint | Apps Script | 2–3 hari |
| **2** | Setup Vite+React, routing, context auth, service API | React | 1 hari |
| **3** | Halaman Login + Registrasi | React | 2 hari |
| **4** | Dashboard peserta + Presensi (GPS + Kamera + Submit) | React | 3 hari |
| **5** | Riwayat presensi + Pengajuan izin | React | 2 hari |
| **6** | Dashboard admin + Approval + Lokasi | React | 3 hari |
| **7** | Testing end-to-end + Bug fix + Deploy | — | 2 hari |
| **Total** | | | **~2 minggu** |

---

## 12. Pertanyaan Sebelum Mulai Coding

> [!IMPORTANT]
> Jawab ini dulu agar kita bisa langsung coding tanpa tebak-tebakan:

1. **Boleh share link Spreadsheet?** Agar struktur kolom bisa dipetakan akurat
2. **Email Google yang owner Spreadsheet?** Untuk di-link ke Apps Script
3. **Nama & koordinat GPS lokasi penugasan?** (misal: Kantor Daop, Stasiun, dll)
4. **Siapa admin pertama?** Perlu dibuat manual di Sheets sebelum sistem jalan
5. **Radius toleransi GPS:** 100 meter oke, atau mau lebih besar/kecil?
6. **Deploy ke mana?** GitHub Pages (gratis) atau domain sendiri?

---

*Versi 3.0 — Stack Final: Vite + React (Frontend) + Google Apps Script (Backend) + Google Sheets (Database)*
