// ─── HELPER MENDASAR ─────────────────────────────────────────
function getSheet(name) {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
}

/**
 * DEBUG: Jalankan manual di GAS Editor untuk cek mengapa peserta muncul Alfa
 * Klik Run → debugIdMismatch → lihat Log (Ctrl+Enter)
 */
function debugIdMismatch() {
  var today = new Date();
  var tglNorm = String(today.getDate()).padStart(2,'0') + '/' + String(today.getMonth()+1).padStart(2,'0') + '/' + today.getFullYear();
  Logger.log('=== DEBUG tanggal target: ' + tglNorm + ' ===');

  var pSheet  = getSheet('WEB Presensi');
  var regSheet = getSheet('WEB Register');

  // Tampilkan semua ID & tanggal di WEB Presensi hari ini
  Logger.log('\n--- WEB Presensi (baris hari ini) ---');
  if (pSheet) {
    var pRows = pSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < pRows.length; i++) {
      var tglRaw = pRows[i][0];
      Logger.log('Row ' + (i+1) + ': tgl="' + tglRaw + '" | norm="' + normalizeTanggal(tglRaw) + '" | id="' + pRows[i][1] + '" | nama="' + pRows[i][2] + '" | status="' + pRows[i][11] + '"');
    }
  }

  // Tampilkan semua ID aktif di WEB Register
  Logger.log('\n--- WEB Register (semua active) ---');
  if (regSheet) {
    var rRows = regSheet.getDataRange().getDisplayValues();
    for (var r = 1; r < rRows.length; r++) {
      if (String(rRows[r][11]).toLowerCase() === 'active') {
        Logger.log('Row ' + (r+1) + ': id="' + rRows[r][14] + '" | nama="' + rRows[r][1] + '" | statusAkun="' + rRows[r][11] + '"');
      }
    }
  }
  Logger.log('=== SELESAI DEBUG ===');
}


function getOrCreateSheet(name) {
  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function generatePesertaId() {
  var sheet = getOrCreateSheet('WEB Register');
  var count = Math.max(sheet.getLastRow() - 1, 1);
  return 'MGGNG-' + String(count).padStart(3, '0');
}

// ============================================================
