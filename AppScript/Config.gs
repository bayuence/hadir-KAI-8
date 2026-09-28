// SISTEM PRESENSI DIGITAL MAGANG — KAI Daop 8 Unit Operasi
// Google Apps Script Backend — Code.gs
// Versi: 3.2 (Single Sheet Presensi & Fix Error)
// ============================================================
//
// CARA DEPLOY:
// 1. Buka Spreadsheet -> Ekstensi -> Apps Script
// 2. Copy-paste seluruh kode ini menimpa kode sebelumnya
// 3. Pastikan SPREADSHEET_ID sudah benar
// 4. Jalankan fungsi "setupPeralihanAwal" secara manual 1 KALI saja.
//    (Pilih fungsi setupPeralihanAwal di atas -> Klik Run)
// 5. Deploy -> New deployment -> Web App
// ============================================================

var CONFIG = {
  SPREADSHEET_ID:  '1GrYg3gDKSdfc8i2mTcbDPpbvci7-IppdDm1M55O7hf8',
  ADMIN_TOKEN:     'KAI_DAOP8_ADMIN_2026',
  FOLDER_FOTO_ID:  'ISI_ID_FOLDER_DRIVE_FOTO', // GANTI INI NANTI JIKA MAU FOTO
  GEOFENCE_RADIUS: 100,
  SESSION_EXPIRE:  24 * 60 * 60 * 1000,
  
  // Konfigurasi Fonnte WhatsApp Gateway API
  FONNTE_TOKEN:       'o3hz8NS85cFJxCSCzjPd',

  // Konfigurasi Meta WhatsApp Cloud API (Optional Legacy)
  WA_PHONE_NUMBER_ID: 'ISI_PHONE_NUMBER_ID_META_DISINI',
  WA_ACCESS_TOKEN:    'ISI_ACCESS_TOKEN_META_DISINI',
  WA_TEMPLATE_NAME:   'hello_world' // Default template dari Meta untuk testing awal
};

