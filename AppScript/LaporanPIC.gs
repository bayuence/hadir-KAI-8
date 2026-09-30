// ============================================================
// MODUL LAPORAN PIC (WHATSAPP) â€” KAI Daop 8
// ============================================================

// â”€â”€ GANTI DENGAN NOMOR WA PIC ANDA (Gunakan format 08... atau 628...) â”€â”€
var NOMOR_WA_PIC = '081234567890'; // <-- UBAH NOMOR INI

function kirimLaporanKePIC() {
  var dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip jika Sabtu/Minggu

  var todayStr = formatTanggal(); // Helper dari Helpers.gs (DD/MM/YYYY)
  var todayNorm = normalizeTanggal(todayStr);

  var regSheet = getSheet('WEB Register');
  var presSheet = getSheet('WEB Presensi');
  
  if (!regSheet || !presSheet) {
    Logger.log('Sheet tidak ditemukan.');
    return;
  }

  var regRows = regSheet.getDataRange().getDisplayValues();
  var presRows = presSheet.getDataRange().getDisplayValues();

  var daftarAlfa = [];
  var daftarSakit = [];
  var daftarIzin = [];
  var totalAktif = 0;
  var totalHadir = 0;

  for (var i = 1; i < regRows.length; i++) {
    var statusAcc = String(regRows[i][12]).toLowerCase().trim();
    if (statusAcc !== 'active') continue;

    // Cek apakah masih dalam masa magang
    if (statusMasaMagang(String(regRows[i][9] || ''), String(regRows[i][10] || ''), todayNorm) !== 'Aktif') continue;

    var idPeserta = regRows[i][15];
    var nama      = regRows[i][1];
    totalAktif++;

    // Cari di presensi hari ini
    var statusHariIni = 'Alfa (Belum Absen)';
    var jamMasuk = '';
    
    for (var j = presRows.length - 1; j >= 1; j--) {
      if (normalizeTanggal(presRows[j][0]) === todayNorm && String(presRows[j][1]) === String(idPeserta)) {
        jamMasuk = presRows[j][4]; // Kolom Jam Masuk
        statusHariIni = String(presRows[j][11]).trim(); // Kolom Status (Hadir, Ijin Sakit, dll)
        break;
      }
    }

    var statusLower = statusHariIni.toLowerCase();

    // Kategorisasi
    if (statusLower.indexOf('hadir') !== -1 && jamMasuk !== '') {
      totalHadir++;
    } 
    else if (statusLower.indexOf('sakit') !== -1) {
      daftarSakit.push("- " + nama + " (Sakit)");
    } 
    else if (statusLower.indexOf('ijin') !== -1 || statusLower.indexOf('izin') !== -1) {
      var alasan = statusHariIni; 
      daftarIzin.push("- " + nama + " (" + alasan + ")");
    } 
    else {
      daftarAlfa.push("- " + nama);
    }
  }

  var rincianSakit = daftarSakit.length > 0 ? daftarSakit.join("\n") : "- Tidak ada";
  var rincianIzin  = daftarIzin.length > 0  ? daftarIzin.join("\n") : "- Tidak ada";
  var rincianAlfa  = daftarAlfa.length > 0  ? daftarAlfa.join("\n") : "- Tidak ada";

  var totalTidakHadir = daftarSakit.length + daftarIzin.length + daftarAlfa.length;

  var pesan = 
    "*LAPORAN KEHADIRAN MAGANG*\n" +
    "PT Kereta Api Indonesia (Persero) Daop 8 Surabaya\n" +
    "Tanggal: *" + todayStr + "*\n\n" +
    "Yth. Bapak/Ibu PIC,\n\n" +
    "Bersama pesan ini, kami sampaikan rekapitulasi kehadiran peserta magang pada hari ini dengan rincian sebagai berikut:\n\n" +
    "Total Peserta Aktif : " + totalAktif + " Peserta\n" +
    "Peserta Hadir       : " + totalHadir + " Peserta\n" +
    "Peserta Tidak Hadir : " + totalTidakHadir + " Peserta\n\n" +
    "*Rincian Peserta Tidak Hadir:*\n\n" +
    "*1. Sakit:*\n" + rincianSakit + "\n\n" +
    "*2. Izin:*\n" + rincianIzin + "\n\n" +
    "*3. Belum Presensi (Alfa):*\n" + rincianAlfa + "\n\n" +
    "Demikian laporan ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.\n\n" +
    "Hormat kami,\n" +
    "Tim Admin Magang Daop 8";

  kirimWhatsAppFonnte(NOMOR_WA_PIC, pesan);
  Logger.log('Laporan PIC berhasil dikirim ke ' + NOMOR_WA_PIC);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TRIGGER UNTUK LAPORAN PIC (Jalankan sekali untuk memasang)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setupTriggerLaporanPIC() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'kirimLaporanKePIC') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Mengirim laporan setiap hari jam 17:30 (5:30 sore)
  ScriptApp.newTrigger('kirimLaporanKePIC')
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .nearMinute(30)
    .create();

  Logger.log('Trigger Laporan PIC berhasil dipasang untuk jam 17:30 (5:30 sore) setiap hari.');
}
