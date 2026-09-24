// ============================================================
// MODUL EMAIL PENGINGAT PRESENSI — KAI Daop 8
// Versi: 2.0  |  By: ence  |  2026
//
// FORMAT: Plain-text bergaya WhatsApp (konsisten dengan bot WA)
//
// JADWAL PENGINGAT:
// 07:45 → Pengingat pra-masuk (sebelum jam kerja)
// 08:30 → Cek toleransi masuk (belum check-in setelah 08:15)
// 11:50 → Pengingat menjelang istirahat
// 13:00 → Pengingat kembali kerja setelah istirahat
// 13:15 → Cek toleransi kembali dari istirahat
// 16:30 → Pengingat menjelang jam pulang
// 17:15 → Cek apakah sudah presensi pulang
//
// CARA PAKAI:
// 1. Tambahkan file ini ke GAS Editor sebagai "EmailPengingat.gs"
// 2. Jalankan "hapusTriggerEmailDuplikat()" JIKA email sudah spam
// 3. Jalankan "setupSemuaTriggerEmail()" SATU KALI saja.
// ============================================================

// ── GANTI INI DENGAN EMAIL ANDA (untuk fungsi testEmailPengingat) ────
var EMAIL_TEST = 'bayuence354@gmail.com';

// ── URL APLIKASI ──────────────────────────────────────────────
var APP_URL = 'https://hadirkai8.vercel.app/';

// ── AMBIL SEMUA PESERTA AKTIF BESERTA EMAIL ───────────────────
function getPesertaAktif() {
  var sheet = getSheet('WEB Register');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getDisplayValues();
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    var statusAkun = String(rows[i][11] || '').toLowerCase();
    if (statusAkun !== 'active') continue;
    var email = String(rows[i][5] || '').trim();
    var nama  = String(rows[i][1] || '').trim();
    var id    = String(rows[i][14] || '').trim();
    if (!email || !nama || !id) continue;
    hasil.push({ id: id, nama: nama, email: email });
  }
  return hasil;
}

// ── CEK STATUS PRESENSI HARI INI ──────────────────────────────
function sudahCheckIn(idPeserta) {
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return false;
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (normalizeTanggal(rows[i][0]) === today && rows[i][1] === idPeserta) {
      return rows[i][4] !== '';
    }
  }
  return false;
}

function sudahCheckOut(idPeserta) {
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return false;
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (normalizeTanggal(rows[i][0]) === today && rows[i][1] === idPeserta) {
      return rows[i][6] !== '';
    }
  }
  return false;
}

function sudahIzinHariIni(idPeserta) {
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return false;
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (normalizeTanggal(rows[i][0]) === today && rows[i][1] === idPeserta) {
      var status = String(rows[i][11] || '').toLowerCase();
      return status === 'ijin' || status === 'sakit';
    }
  }
  return false;
}

// ── KIRIM EMAIL (FORMAT PLAIN TEXT BERGAYA WA) ────────────────
function kirimEmailPengingat(email, subjek, pesan) {
  MailApp.sendEmail({
    to: email,
    subject: subjek,
    body: pesan,
    name: 'Bot Pengingat KAI Daop 8'
  });
}

// ─────────────────────────────────────────────────────────────
// 1. PENGINGAT PRA-MASUK — 07:45
//    Dikirim ke semua peserta aktif sebelum jam kerja dimulai
// ─────────────────────────────────────────────────────────────
function emailPengingatPreMasuk() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;

    var pesan =
      "🔔 PENGINGAT PRESENSI MASUK — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa saat ini sudah memasuki waktu presensi masuk magang KAI Daop 8.\n\n" +
      "Mohon segera lakukan Presensi Masuk melalui tautan aplikasi presensi berikut:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Selamat beraktivitas dan tetap semangat ya! 🚂✨\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] 🔔 Pengingat: Presensi Masuk Jam 08:00 Hari Ini',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[07:45 PRE-MASUK] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 2. CEK TOLERANSI MASUK — 08:30
//    Dikirim HANYA ke peserta yang BELUM check-in setelah 08:15
// ─────────────────────────────────────────────────────────────
function emailCekToleransiMasuk() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (sudahCheckIn(p.id)) return;

    var pesan =
      "⚠️ PERINGATAN PRESENSI — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa batas toleransi presensi masuk (08:15 WIB) telah berakhir, namun Anda belum melakukan Presensi Masuk.\n\n" +
      "Keterlambatan ini akan tercatat dalam laporan kehadiran Anda.\n\n" +
      "Jika tidak hadir hari ini, segera ajukan izin melalui aplikasi:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Terima kasih atas perhatiannya. 🚂\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] ⚠️ PERINGATAN: Belum Presensi Masuk',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[08:30 CEK TOLERANSI MASUK] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 3. PENGINGAT MENJELANG ISTIRAHAT — 11:50
// ─────────────────────────────────────────────────────────────
function emailPengingatIstirahat() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (!sudahCheckIn(p.id)) return;

    var pesan =
      "🔔 PENGINGAT ISTIRAHAT — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa istirahat siang akan dimulai 10 menit lagi, pukul 12:00 WIB.\n\n" +
      "Nikmati waktu istirahat Anda dan pastikan kembali tepat waktu pukul 13:00 WIB ya.\n\n" +
      "Akses aplikasi presensi:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Selamat istirahat! 🍽️\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] 🍽️ Istirahat Siang Dimulai Pukul 12:00',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[11:50 PENGINGAT ISTIRAHAT] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 4. PENGINGAT KEMBALI KERJA — 13:00
// ─────────────────────────────────────────────────────────────
function emailPengingatKembaliKerja() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (!sudahCheckIn(p.id)) return;

    var pesan =
      "🔔 PENGINGAT KEMBALI KERJA — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa waktu istirahat telah selesai.\n\n" +
      "Harap segera kembali ke posisi kerja Anda. Batas toleransi kembali adalah pukul 13:15 WIB.\n\n" +
      "Akses aplikasi presensi:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Semangat bekerja kembali! 💪🚂\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] ⏰ Istirahat Selesai — Kembali Kerja Sekarang!',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[13:00 KEMBALI KERJA] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 5. CEK TOLERANSI KEMBALI ISTIRAHAT — 13:15
// ─────────────────────────────────────────────────────────────
function emailCekToleransiKembaliIstirahat() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (!sudahCheckIn(p.id)) return;

    var pesan =
      "⚠️ PERINGATAN TOLERANSI — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa batas toleransi kembali dari istirahat (13:15 WIB) telah berakhir.\n\n" +
      "Harap segera kembali ke posisi kerja Anda. Keterlambatan berulang memengaruhi penilaian kehadiran.\n\n" +
      "Akses aplikasi presensi:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Terima kasih atas perhatiannya. 🚂\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] ⚠️ PERINGATAN: Toleransi Kembali Istirahat Berakhir',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[13:15 CEK TOLERANSI KEMBALI] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 6. PENGINGAT MENJELANG PULANG — 16:30
// ─────────────────────────────────────────────────────────────
function emailPengingatPrePulang() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (!sudahCheckIn(p.id)) return;
    if (sudahCheckOut(p.id)) return;

    var pesan =
      "🔔 PENGINGAT PRESENSI PULANG — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa jam operasional magang hari ini telah selesai.\n\n" +
      "Jangan lupa untuk segera melakukan Presensi Pulang melalui aplikasi agar absensi dan jam kerja Anda tercatat lengkap:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Terima kasih atas kerja keras Anda hari ini! Hati-hati di perjalanan pulang. 🚂✨\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] 🔔 Pengingat: Presensi Pulang Jam 17:00 Hari Ini',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[16:30 PRE-PULANG] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// 7. CEK PRESENSI PULANG — 17:15
//    Peringatan ke yang sudah masuk tapi BELUM check-out
// ─────────────────────────────────────────────────────────────
function emailCekPresensiPulang() {
  var peserta = getPesertaAktif();
  var terkirim = 0, gagal = 0;

  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;
    if (!sudahCheckIn(p.id)) return;
    if (sudahCheckOut(p.id)) return;

    var pesan =
      "⚠️ PERINGATAN PRESENSI PULANG — KAI DAOP 8\n\n" +
      "Halo " + p.nama + "! 👋\n\n" +
      "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa presensi pulang Anda belum tercatat hingga pukul 17:15 WIB.\n\n" +
      "Segera lakukan Presensi Pulang dari aplikasi jika masih di lokasi penugasan:\n" +
      "👉 " + APP_URL + "\n\n" +
      "Jika ada lembur atau kendala teknis, segera hubungi admin.\n\n" +
      "Hati-hati di perjalanan pulang. 🚂✨\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

    try {
      kirimEmailPengingat(p.email,
        '[KAI Daop 8] ⚠️ PERINGATAN: Belum Presensi Pulang',
        pesan);
      terkirim++;
    } catch(e) { Logger.log('[GAGAL] ' + p.email + ': ' + e.message); gagal++; }
  });

  Logger.log('[17:15 CEK PULANG] Terkirim: ' + terkirim + ', Gagal: ' + gagal);
}

// ─────────────────────────────────────────────────────────────
// HAPUS TRIGGER EMAIL DUPLIKAT
// Jalankan fungsi ini JIKA email sudah terlanjur spam
// ─────────────────────────────────────────────────────────────
function hapusTriggerEmailDuplikat() {
  var daftarFungsi = [
    'emailPengingatPreMasuk',
    'emailCekToleransiMasuk',
    'emailPengingatIstirahat',
    'emailPengingatKembaliKerja',
    'emailCekToleransiKembaliIstirahat',
    'emailPengingatPrePulang',
    'emailCekPresensiPulang'
  ];

  var triggers = ScriptApp.getProjectTriggers();
  var hapus = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (daftarFungsi.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
      hapus++;
      Logger.log('Trigger email dihapus: ' + triggers[i].getHandlerFunction());
    }
  }
  Logger.log('=== Total trigger EMAIL dihapus: ' + hapus + ' ===');
  if (hapus === 0) Logger.log('(Tidak ada trigger email aktif yang ditemukan)');
}

// ─────────────────────────────────────────────────────────────
// SETUP: PASANG SEMUA TRIGGER EMAIL OTOMATIS
// Jalankan fungsi ini SATU KALI dari GAS Editor
// ─────────────────────────────────────────────────────────────
function setupSemuaTriggerEmail() {
  // Hapus semua trigger email lama terlebih dahulu (hindari duplikat)
  hapusTriggerEmailDuplikat();

  // Pasang 7 trigger baru
  ScriptApp.newTrigger('emailPengingatPreMasuk')
    .timeBased().everyDays(1).atHour(7).nearMinute(45).create();

  ScriptApp.newTrigger('emailCekToleransiMasuk')
    .timeBased().everyDays(1).atHour(8).nearMinute(30).create();

  ScriptApp.newTrigger('emailPengingatIstirahat')
    .timeBased().everyDays(1).atHour(11).nearMinute(50).create();

  ScriptApp.newTrigger('emailPengingatKembaliKerja')
    .timeBased().everyDays(1).atHour(13).nearMinute(0).create();

  ScriptApp.newTrigger('emailCekToleransiKembaliIstirahat')
    .timeBased().everyDays(1).atHour(13).nearMinute(15).create();

  ScriptApp.newTrigger('emailPengingatPrePulang')
    .timeBased().everyDays(1).atHour(16).nearMinute(30).create();

  ScriptApp.newTrigger('emailCekPresensiPulang')
    .timeBased().everyDays(1).atHour(17).nearMinute(15).create();

  Logger.log('==================================================');
  Logger.log('SEMUA 7 TRIGGER EMAIL BERHASIL DIPASANG!');
  Logger.log('==================================================');
  Logger.log('  07:45 => Pengingat Pra-Masuk (semua peserta)');
  Logger.log('  08:30 => Cek Toleransi Masuk (belum check-in)');
  Logger.log('  11:50 => Pengingat Istirahat Siang');
  Logger.log('  13:00 => Pengingat Kembali Kerja');
  Logger.log('  13:15 => Cek Toleransi Kembali Istirahat');
  Logger.log('  16:30 => Pengingat Pre-Pulang');
  Logger.log('  17:15 => Cek Presensi Pulang (belum check-out)');
  Logger.log('==================================================');
}

// ─────────────────────────────────────────────────────────────
// TEST: Kirim email uji ke email yang sudah dikonfigurasi
// ─────────────────────────────────────────────────────────────
function testEmailPengingat() {
  var pesan =
    "🔔 PENGINGAT PRESENSI PULANG — KAI DAOP 8\n\n" +
    "Halo ence (Test)! 👋\n\n" +
    "Saya ence dari Tim Magang Daop 8 ingin mengingatkan bahwa jam operasional magang hari ini telah selesai.\n\n" +
    "Jangan lupa untuk segera melakukan Presensi Pulang melalui aplikasi agar absensi dan jam kerja Anda tercatat lengkap:\n" +
    "👉 " + APP_URL + "\n\n" +
    "Terima kasih atas kerja keras Anda hari ini! Hati-hati di perjalanan pulang. 🚂✨\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "Pesan resmi dikirim otomatis oleh Sistem Presensi Daop 8 Surabaya";

  MailApp.sendEmail({
    to: EMAIL_TEST,
    subject: '[KAI Daop 8] TEST — Sistem Email Pengingat Presensi Berhasil',
    body: pesan,
    name: 'Bot Pengingat KAI Daop 8'
  });

  Logger.log('Test email berhasil dikirim ke: ' + EMAIL_TEST);
}
