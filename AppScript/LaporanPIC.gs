// ============================================================
// MODUL LAPORAN PIC (WHATSAPP) â€” KAI Daop 8
// ============================================================

// ── GANTI DENGAN ID GRUP WA LAPORAN PIC (Format: 120363xxxxxxxx@g.us) ──
var ID_GRUP_LAPORAN_PIC = '120363421534156400@g.us'; // <-- UBAH ID INI

function kirimLaporanKePIC() {
  var dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip jika Sabtu/Minggu

  // AMBIL DATA TERBARU DARI FORM LAMA DULU SEBELUM BIKIN LAPORAN!
  if (typeof sinkronFormResponses === 'function') {
    sinkronFormResponses();
  }

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

  var daftarHadirLengkap = [];
  var daftarLupaPulang = [];
  var daftarAlfa = [];
  var daftarSakit = [];
  var daftarIzin = [];
  var daftarNonaktif = [];
  
  var totalKeseluruhan = 0;
  var totalAktif = 0;

  for (var i = 1; i < regRows.length; i++) {
    var idPeserta = String(regRows[i][11] || '').trim();
    if (!idPeserta) continue; // Abaikan baris kosong

    totalKeseluruhan++;
    var nama = regRows[i][1];

    // Cek apakah Nonaktif (entah tulisannya nonaktif atau masa magangnya habis)
    var statusAcc = String(regRows[i][8]).toLowerCase().trim();
    var isNonaktif = (statusAcc !== 'active'); // Hanya percayakan pada kolom M (Status Akun) yang sudah pakai rumus Google Sheets

    if (isNonaktif) {
      daftarNonaktif.push("- " + nama);
      continue;
    }

    totalAktif++;

    // Cari di presensi hari ini
    var statusHariIni = 'Alfa (Belum Absen)';
    var jamMasuk = '';
    var jamPulang = '';
    
    for (var j = presRows.length - 1; j >= 1; j--) {
      if (normalizeTanggal(presRows[j][0]) === todayNorm && String(presRows[j][1]) === String(idPeserta)) {
        jamMasuk = presRows[j][4] || ''; // Kolom Jam Masuk
        jamPulang = presRows[j][6] || ''; // Kolom Jam Pulang
        statusHariIni = String(presRows[j][11]).trim(); // Kolom Status
        break;
      }
    }

    var statusLower = statusHariIni.toLowerCase();

    // Kategorisasi
    if (statusLower.indexOf('hadir') !== -1 && jamMasuk !== '') {
      if (jamPulang !== '') {
        daftarHadirLengkap.push("- " + nama + " (Masuk: " + jamMasuk + " | Pulang: " + jamPulang + ")");
      } else {
        daftarLupaPulang.push("- " + nama + " (Masuk: " + jamMasuk + ")");
      }
    } 
    else if (statusLower.indexOf('sakit') !== -1) {
      daftarSakit.push("- " + nama + " (Sakit)");
    } 
    else if (statusLower.indexOf('ijin') !== -1 || statusLower.indexOf('izin') !== -1) {
      daftarIzin.push("- " + nama + " (" + statusHariIni + ")");
    } 
    else {
      daftarAlfa.push("- " + nama);
    }
  }

  var totalHadirLengkap = daftarHadirLengkap.length;
  var totalLupaPulang = daftarLupaPulang.length;
  var totalSakit = daftarSakit.length;
  var totalIzin = daftarIzin.length;
  var totalAlfa = daftarAlfa.length;
  
  var totalHadir = totalHadirLengkap + totalLupaPulang;
  var totalTidakHadir = totalSakit + totalIzin + totalAlfa;
  var totalNonaktif = daftarNonaktif.length;

  var strLupaPulang = totalLupaPulang > 0 ? daftarLupaPulang.join("\n") : "- Tidak ada";
  var strSakit = totalSakit > 0 ? daftarSakit.join("\n") : "- Tidak ada";
  var strIzin  = totalIzin > 0  ? daftarIzin.join("\n") : "- Tidak ada";
  var strAlfa  = totalAlfa > 0  ? daftarAlfa.join("\n") : "- Tidak ada";
  var strNonaktif = totalNonaktif > 0 ? daftarNonaktif.join("\n") : "- Tidak ada";

  var pesan = 
    "*LAPORAN KEHADIRAN MAGANG*\n" +
    "PT Kereta Api Indonesia (Persero) Daop 8 Surabaya\n" +
    "Tanggal: *" + todayStr + "*\n\n" +
    "Yth. Bapak/Ibu PIC,\n\n" +
    "Bersama pesan ini, kami sampaikan rekapitulasi kehadiran peserta magang pada hari ini dengan rincian sebagai berikut:\n\n" +
    "---------------------------------------------------\n" +
    "Total Peserta Keseluruhan      : " + totalKeseluruhan + " Peserta\n" +
    "Total Selesai Magang / Nonaktif: " + totalNonaktif + " Peserta\n" +
    "Total Peserta Magang Aktif     : " + totalAktif + " Peserta\n" +
    "---------------------------------------------------\n\n" +
    "*Dari " + totalAktif + " Peserta Aktif, rinciannya adalah:*\n" +
    "- Hadir Total  : " + totalHadir + " Peserta\n" +
    "- Tidak Hadir  : " + totalTidakHadir + " Peserta\n\n" +
    "*1. Rincian Hadir:*\n" +
    "- Hadir Lengkap (Masuk & Pulang): " + totalHadirLengkap + " Peserta\n" +
    "- Belum/Lupa Presensi Pulang    : " + totalLupaPulang + " Peserta\n\n" +
    "*2. Rincian Tidak Hadir:*\n" +
    "- Sakit                         : " + totalSakit + " Peserta\n" +
    "- Izin                          : " + totalIzin + " Peserta\n" +
    "- Belum Presensi / Alfa         : " + totalAlfa + " Peserta\n\n" +
    "---------------------------------------------------\n" +
    "Demikian laporan ringkas ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.\n\n" +
    "Hormat kami,\n" +
    "Tim Admin Magang Daop 8";

  kirimWhatsAppFonnte(ID_GRUP_LAPORAN_PIC, pesan);
  Logger.log('Laporan PIC berhasil dikirim ke Grup (ID: ' + ID_GRUP_LAPORAN_PIC + ')');
}

// -
// TRIGGER UNTUK LAPORAN PIC (Jalankan sekali untuk memasang)
// -
function setupTriggerLaporanPIC() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'kirimLaporanKePIC') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Mengirim laporan setiap hari jam 16:00 (4:00 sore)
  ScriptApp.newTrigger('kirimLaporanKePIC')
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .nearMinute(0)
    .create();

  Logger.log('Trigger Laporan PIC berhasil dipasang untuk jam 16:00 (4:00 sore) setiap hari.');
}

