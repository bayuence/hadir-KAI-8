// ============================================================
// MODUL PENGINGAT TERPADU (EMAIL + WHATSAPP) — KAI Daop 8
// Versi: 3.0  |  By: ence  |  2026
//
// FORMAT: Plain-text santai agar tidak masuk SPAM Google.
// Menggabungkan pengiriman Email dan WhatsApp secara bersamaan.
// ============================================================

var EMAIL_TEST = 'bayuence354@gmail.com';
var APP_URL = 'https://hadirkai8.vercel.app/';

function getPesertaAktif() {
  var sheet = getSheet('WEB Register');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getDisplayValues();
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    var statusAkun = String(rows[i][11] || '').toLowerCase();
    if (statusAkun !== 'active') continue;
    if (statusMasaMagang(String(rows[i][8] || ''), String(rows[i][9] || ''), today) !== 'Aktif') continue;
    var email = String(rows[i][5] || '').trim();
    var nama  = String(rows[i][1] || '').trim();
    var id    = String(rows[i][14] || '').trim();
    var noHp  = String(rows[i][4] || '').trim(); // Tambahan noHp untuk WhatsApp
    if (!email || !nama || !id) continue;
    hasil.push({ id: id, nama: nama, email: email, noHp: noHp });
  }
  return hasil;
}

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
      return status === 'ijin' || status === 'sakit' || status === 'ijin sakit' || status === 'ijin kampus' || status === 'ijin lain';
    }
  }
  return false;
}

function kirimNotifikasiTerpadu(p, subjekEmail, pesan) {
  // 1. Kirim Email
  try {
    MailApp.sendEmail({
      to: p.email,
      subject: subjekEmail,
      body: pesan,
      name: 'Tim Magang KAI Daop 8' // Diperhalus dari "Bot Pengingat"
    });
  } catch(e) { Logger.log('[GAGAL EMAIL] ' + p.email + ': ' + e.message); }

  // 2. Kirim WhatsApp
  if (p.noHp) {
    try {
      kirimWhatsAppFonnte(p.noHp, pesan);
    } catch(e) { Logger.log('[GAGAL WA] ' + p.noHp + ': ' + e.message); }
  }
}

// ─────────────────────────────────────────────────────────────
// 1. PENGINGAT PRA-MASUK — 07:45
// ─────────────────────────────────────────────────────────────
function emailPengingatPreMasuk() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 ingin mengucapkan selamat pagi! Jangan lupa saat ini sudah memasuki waktu presensi masuk magang ya.\n\n" +
      "Silakan lakukan presensi masuk melalui tautan ini:\n" +
      APP_URL + "\n\n" +
      "Semangat beraktivitas hari ini!\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Waktu Presensi Masuk Pagi', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// 2. CEK TOLERANSI MASUK — 08:30
// ─────────────────────────────────────────────────────────────
function emailCekToleransiMasuk() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id) || sudahCheckIn(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 melihat Anda belum melakukan presensi masuk hingga batas toleransi pagi ini.\n\n" +
      "Jika Anda lupa, mohon segera mengisi presensi di aplikasi:\n" +
      APP_URL + "\n\n" +
      "Jika Anda berhalangan hadir, silakan ajukan izin melalui menu yang tersedia.\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Anda belum presensi masuk hari ini', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// 3. PENGINGAT MENJELANG ISTIRAHAT — 11:50
// ─────────────────────────────────────────────────────────────
function emailPengingatIstirahat() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id) || !sudahCheckIn(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 ingin menginfokan bahwa waktu istirahat akan dimulai pukul 12:00 WIB. Selamat beristirahat dan jangan lupa kembali bekerja pada pukul 13:00 WIB ya.\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Istirahat siang segera dimulai', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// 4. PENGINGAT KEMBALI KERJA — 13:00
// ─────────────────────────────────────────────────────────────
function emailPengingatKembaliKerja() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id) || !sudahCheckIn(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 mengingatkan bahwa waktu istirahat telah selesai. Mari semangat bekerja kembali!\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Waktu istirahat selesai', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// 5. CEK TOLERANSI KEMBALI ISTIRAHAT — 13:15
// ─────────────────────────────────────────────────────────────
function emailCekToleransiKembaliIstirahat() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)
  // Note: Hanya berlaku pengingat tanpa logic spesifik check kembali
}

// ─────────────────────────────────────────────────────────────
// 6. PENGINGAT MENJELANG PULANG — 16:30
// ─────────────────────────────────────────────────────────────
function emailPengingatPrePulang() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id) || !sudahCheckIn(p.id) || sudahCheckOut(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 ingin mengingatkan bahwa jam operasional magang hari ini segera berakhir. Jangan lupa untuk melakukan presensi pulang ya:\n" +
      APP_URL + "\n\n" +
      "Terima kasih atas kerja keras Anda hari ini!\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Waktu Presensi Pulang', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// 7. CEK PRESENSI PULANG — 17:15
// ─────────────────────────────────────────────────────────────
function emailCekPresensiPulang() {
  var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)

  var peserta = getPesertaAktif();
  peserta.forEach(function(p) {
    if (sudahIzinHariIni(p.id) || !sudahCheckIn(p.id) || sudahCheckOut(p.id)) return;

    var pesan =
      "Halo " + p.nama + ",\n\n" +
      "Saya ence dari tim Magang Daop 8 melihat Anda belum mencatatkan presensi pulang pada sistem. Silakan lengkapi presensi pulang Anda melalui aplikasi:\n" +
      APP_URL + "\n\n" +
      "--\nence - Tim Magang Daop 8";

    kirimNotifikasiTerpadu(p, 'Info: Anda belum presensi pulang hari ini', pesan);
  });
}

// ─────────────────────────────────────────────────────────────
// SETUP & CLEANUP
// ─────────────────────────────────────────────────────────────
function hapusTriggerEmailDuplikat() {
  var daftarFungsi = [
    'emailPengingatPreMasuk', 'emailCekToleransiMasuk', 'emailPengingatIstirahat',
    'emailPengingatKembaliKerja', 'emailCekToleransiKembaliIstirahat',
    'emailPengingatPrePulang', 'emailCekPresensiPulang'
  ];
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (daftarFungsi.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log('Trigger notifikasi berhasil dihapus.');
}

function setupSemuaTriggerEmail() {
  hapusTriggerEmailDuplikat();
  ScriptApp.newTrigger('emailPengingatPreMasuk').timeBased().everyDays(1).atHour(7).nearMinute(45).create();
  ScriptApp.newTrigger('emailCekToleransiMasuk').timeBased().everyDays(1).atHour(8).nearMinute(30).create();
  ScriptApp.newTrigger('emailPengingatIstirahat').timeBased().everyDays(1).atHour(11).nearMinute(50).create();
  ScriptApp.newTrigger('emailPengingatKembaliKerja').timeBased().everyDays(1).atHour(13).nearMinute(0).create();
  ScriptApp.newTrigger('emailPengingatPrePulang').timeBased().everyDays(1).atHour(16).nearMinute(30).create();
  ScriptApp.newTrigger('emailCekPresensiPulang').timeBased().everyDays(1).atHour(17).nearMinute(15).create();
  Logger.log('Trigger Terpadu (WA & Email) selesai dipasang!');
}
