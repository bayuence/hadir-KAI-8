// SINKRONISASI OTOMATIS: Form Responses 1 -> WEB Presensi
// ============================================================
// Fungsi ini aman dijalankan berulang kali — tidak akan duplikat.
// Bisa dijalankan manual kapan saja dari Apps Script Editor.
// Juga dipanggil otomatis setiap hari (trigger harian).
function sinkronFormResponses() {
  var oldRes = getSheet('Form Responses 1');
  var webReg = getSheet('WEB Register');
  var pSheet = getOrCreateSheet('WEB Presensi');
  
  if (!oldRes) { Logger.log('Sheet Form Responses 1 tidak ditemukan.'); return; }
  if (!webReg) { Logger.log('Sheet WEB Register tidak ditemukan.'); return; }
  
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }
  
  var added = _prosesFormResponsesToPresensi(oldRes, webReg, pSheet, false);
  Logger.log('sinkronFormResponses selesai. Baris baru/diupdate: ' + added);
}

// ─── Helper inti: proses Form Responses 1 -> WEB Presensi ────
// forceOverwrite=true  : tulis ulang semua (migrasi pertama kali, WEB Presensi kosong)
// forceOverwrite=false : incremental — hanya tambah/update yang belum ada
function _prosesFormResponsesToPresensi(oldRes, webReg, pSheet, forceOverwrite) {
  var respRows = oldRes.getDataRange().getDisplayValues();
  var allRegRows = webReg.getDataRange().getDisplayValues();
  
  // Buat map peserta: nama_lowercase -> { id, nama }
  var mapPeserta = {};
  for (var k = 1; k < allRegRows.length; k++) {
    var kNama = String(allRegRows[k][1]).toLowerCase().trim();
    if (kNama) mapPeserta[kNama] = { id: allRegRows[k][11], nama: allRegRows[k][1] };
  }
  
  // Baca data WEB Presensi yang sudah ada: map "ID_TANGGALNORM" -> baris (1-indexed)
  var existingRows = pSheet.getDataRange().getDisplayValues();
  var existingMap = {}; // key -> row index (1-indexed, for getRange)
  if (!forceOverwrite) {
    for (var e = 1; e < existingRows.length; e++) {
      var eKey = existingRows[e][1] + '_' + normalizeTanggal(existingRows[e][0]);
      existingMap[eKey] = e + 1; // row number in sheet
    }
  }
  
  // Proses semua baris Form Responses 1 ke dalam presensiMap di memori
  // Key: "ID_TANGGALNORM" -> rowData array [12 kolom]
  var presensiMap = {};
  
  for (var r = 1; r < respRows.length; r++) {
    var rNama  = String(respRows[r][1]).toLowerCase().trim();
    var pData  = mapPeserta[rNama];
    if (!pData || !pData.id) continue;
    
    var tanggal = respRows[r][5];
    var tglNorm = normalizeTanggal(tanggal);
    if (!tglNorm) continue;
    
    var konfirmasi = String(respRows[r][6]).toLowerCase().trim();
    var jam        = formatJam(respRows[r][0]);
    var lokasi     = respRows[r][4] || '';
    var fotoUrl    = respRows[r][7] || '';
    
    var key = pData.id + '_' + tglNorm;
    
    // Tentukan status
    var isIjin = (konfirmasi === 'ijin sakit' ||
                  konfirmasi === 'ijin acara kampus' ||
                  konfirmasi === 'ijin keperluan lain');
    var statusLabel = konfirmasi === 'ijin sakit'          ? 'Ijin Sakit'
                    : konfirmasi === 'ijin acara kampus'   ? 'Ijin Kampus'
                    : konfirmasi === 'ijin keperluan lain' ? 'Ijin Lain'
                    : 'Hadir';
    
    if (!presensiMap[key]) {
      // [Tgl, ID, Nama, Lokasi, JamMasuk, FotoM, JamPulang, FotoP, TotalJam, GPS_M, GPS_P, Status]
      presensiMap[key] = [tglNorm, pData.id, pData.nama, lokasi, '', '', '', '', '', '', '', isIjin ? statusLabel : 'Hadir'];
    }
    
    if (konfirmasi === 'datang') {
      if (!presensiMap[key][4]) {
        presensiMap[key][4] = jam;
        if (lokasi) presensiMap[key][3] = lokasi;
        if (fotoUrl) presensiMap[key][5] = fotoUrl;
      }
    } else if (konfirmasi === 'pulang') {
      if (!presensiMap[key][6]) {
        presensiMap[key][6] = jam;
        if (fotoUrl) presensiMap[key][7] = fotoUrl;
        presensiMap[key][8] = hitungTotalJam(presensiMap[key][4] || jam, jam);
      }
    } else if (isIjin) {
      // Ijin: 1x isi sudah cukup.
      // Jam submit = jam lapor ijin (JAM MASUK), foto = bukti ijin (FOTO MASUK).
      // Duplikat ijin di tanggal sama -> diabaikan (first-write-wins).
      presensiMap[key][11] = statusLabel;
      if (lokasi) presensiMap[key][3] = lokasi;
      if (!presensiMap[key][4]) presensiMap[key][4] = jam;      // jam lapor ijin
      if (!presensiMap[key][5] && fotoUrl) presensiMap[key][5] = fotoUrl; // bukti foto
    }
  }
  
  // Tulis ke WEB Presensi
  var newRows = [];
  var updatedCount = 0;
  
  for (var key in presensiMap) {
    var row = presensiMap[key];
    var existingRowIdx = existingMap[key];
    
    if (forceOverwrite || !existingRowIdx) {
      // Data belum ada di WEB Presensi — tambahkan
      newRows.push(row);
    } else {
      // Data sudah ada — update kolom yang kosong saja (non-destructive)
      var cur = existingRows[existingRowIdx - 1]; // 0-indexed
      var needUpdate = false;
      
      // Update jam masuk & foto masuk jika belum ada
      if (!cur[4] && row[4]) { pSheet.getRange(existingRowIdx, 5).setValue(row[4]); needUpdate = true; }
      if (!cur[5] && row[5]) { pSheet.getRange(existingRowIdx, 6).setValue(row[5]); needUpdate = true; } // foto masuk / bukti ijin
      // Update jam pulang jika belum ada
      if (!cur[6] && row[6]) {
        pSheet.getRange(existingRowIdx, 7).setValue(row[6]);
        if (row[7]) pSheet.getRange(existingRowIdx, 8).setValue(row[7]); // foto pulang
        if (row[8]) pSheet.getRange(existingRowIdx, 9).setValue(row[8]); // total jam
        needUpdate = true;
      }
      // Update lokasi jika kosong
      if (!cur[3] && row[3]) { pSheet.getRange(existingRowIdx, 4).setValue(row[3]); needUpdate = true; }
      // Update status: Hadir -> Ijin jika seharusnya ijin
      if (cur[11] === 'Hadir' && row[11] !== 'Hadir') {
        pSheet.getRange(existingRowIdx, 12).setValue(row[11]);
        needUpdate = true;
      }
      if (needUpdate) updatedCount++;
    }
  }
  
  // Tulis semua baris baru sekaligus (batch — lebih cepat)
  if (newRows.length > 0) {
    var startRow = pSheet.getLastRow() + 1;
    pSheet.getRange(startRow, 1, newRows.length, 12).setValues(newRows);
  }
  
  return newRows.length + updatedCount;
}

// ─── Setup trigger harian otomatis (sinkronisasi jam 02.00 dini hari) ────
// Panggil ini 1x dari setupPeralihanAwal atau jalankan manual jika belum aktif.
function setupAutoSync() {
  // Hapus trigger sinkron lama jika ada (hindari duplikat)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sinkronFormResponses') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Buat trigger baru: sinkronisasi otomatis setiap hari jam 02.00–03.00
  ScriptApp.newTrigger('sinkronFormResponses')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  Logger.log('Trigger sinkronisasi harian berhasil dipasang (02.00 setiap hari).');
}

function setupRealtimeSync() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onOldFormSubmit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onOldFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  Logger.log("Sensor Realtime (Trigger onFormSubmit) berhasil dipasang!");
}

// ─── HANDLER REAL-TIME DARI FORM LAMA ────────────────────────
function onOldFormSubmit(e) {
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  // 1. Jika ada yang mendaftar dari Google Form lama (Data Registrasi)
  if (sheetName === 'Data Registrasi') {
    var v = e.values;
    var jamSubmit = v[0], nama = v[1], alamat = v[2], hp = v[3], nim = v[4], email = v[5];
    var kampus = v[6], jurusan = v[7], tglMulai = v[8], tglSelesai = v[9];
    var fotoUrl = v[11] || ''; // FOTO TERBARU ada di index 11 (kolom L)
    
    var webReg = getOrCreateSheet('WEB Register');
    var rows = webReg.getDataRange().getDisplayValues();
    
    // Cek apakah sudah terdaftar
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).toLowerCase().trim() === String(nama).toLowerCase().trim()) {
        return; // Sudah ada, tidak perlu insert
      }
    }
    
    var newId = 'MGGNG-' + String(rows.length).padStart(3, '0');
    var fotoRender = '';
    if (fotoUrl) {
      var idFoto = extractDriveId(fotoUrl);
      if (idFoto) fotoRender = "https://drive.google.com/uc?id=" + idFoto;
    }
    
    // Insert ke WEB Register
    webReg.appendRow([
      jamSubmit || new Date().toISOString(), nama, nim, kampus, jurusan, tglMulai, tglSelesai, fotoRender, 'active', 'intern', '', newId
    ]);
    return;
  }
  
  // 2. Jika ada yang absen dari Google Form lama (Form Responses 1)
  if (sheetName !== 'Form Responses 1') return;
  
  var values = e.values; // string array
  var jamSubmit = formatJam(values[0]);
  var nama = String(values[1]).toLowerCase().trim();
  var lokasi = values[4];
  var tanggal = values[5];
  var konfirmasi = String(values[6]).toLowerCase().trim();
  var fotoUrl = values[7] || ''; // Kolom H: DOKUMENTASI (URL foto)
  
  var webReg = getSheet('WEB Register');
  if (!webReg) return;
  var regRows = webReg.getDataRange().getDisplayValues();
  var pId = null, pNamaAsli = nama;
  for (var i = 1; i < regRows.length; i++) {
    if (String(regRows[i][1]).toLowerCase().trim() === nama) {
      pId = regRows[i][11];
      pNamaAsli = regRows[i][1];
      break;
    }
  }
  if (!pId) return; 
  
  var pSheet = getOrCreateSheet('WEB Presensi');
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }
  
  var tanggalNorm = normalizeTanggal(tanggal);
  var pRows = pSheet.getDataRange().getDisplayValues();
  var foundRow = -1;
  for (var x = 1; x < pRows.length; x++) {
    // Normalize kedua sisi agar berbagai format tanggal bisa cocok
    if (normalizeTanggal(pRows[x][0]) === tanggalNorm && pRows[x][1] === pId) {
      foundRow = x + 1; break;
    }
  }
  
  // Tentukan apakah ini entri ijin dan label statusnya
  var isIjin = (konfirmasi === 'ijin sakit' ||
                konfirmasi === 'ijin acara kampus' ||
                konfirmasi === 'ijin keperluan lain');
  var statusLabel = konfirmasi === 'ijin sakit'          ? 'Ijin Sakit'
                  : konfirmasi === 'ijin acara kampus'   ? 'Ijin Kampus'
                  : konfirmasi === 'ijin keperluan lain' ? 'Ijin Lain'
                  : 'Hadir';
  
  if (foundRow > -1) {
    // Row sudah ada untuk tanggal ini
    if (konfirmasi === 'datang' && !pRows[foundRow-1][4]) {
       pSheet.getRange(foundRow, 5).setValue(jamSubmit);
       pSheet.getRange(foundRow, 4).setValue(lokasi);
       if (fotoUrl) pSheet.getRange(foundRow, 6).setValue(fotoUrl);
    } else if (konfirmasi === 'pulang' && !pRows[foundRow-1][6]) {
       pSheet.getRange(foundRow, 7).setValue(jamSubmit);
       if (fotoUrl) pSheet.getRange(foundRow, 8).setValue(fotoUrl);
       var jamM = pRows[foundRow-1][4] || jamSubmit;
       pSheet.getRange(foundRow, 9).setValue(hitungTotalJam(String(jamM), String(jamSubmit)));
    } else if (isIjin && pRows[foundRow-1][11] !== statusLabel) {
      // Update status & lokasi jika belum sesuai
      pSheet.getRange(foundRow, 12).setValue(statusLabel);
      if (lokasi) pSheet.getRange(foundRow, 4).setValue(lokasi);
      // Simpan jam & foto ijin jika belum ada (1x isi form sudah cukup)
      if (!pRows[foundRow-1][4] && jamSubmit) pSheet.getRange(foundRow, 5).setValue(jamSubmit);
      if (!pRows[foundRow-1][5] && fotoUrl)   pSheet.getRange(foundRow, 6).setValue(fotoUrl);
    }
    // Ijin duplikat (status sudah sama) -> abaikan (first-write-wins)
  } else {
    // Belum ada row untuk tanggal ini -> buat baru
    if (konfirmasi === 'datang') {
      pSheet.appendRow([tanggalNorm, pId, pNamaAsli, lokasi, jamSubmit, fotoUrl, '', '', '', '', '', 'Hadir']);
    } else if (konfirmasi === 'pulang') {
      pSheet.appendRow([tanggalNorm, pId, pNamaAsli, lokasi, '', '', jamSubmit, fotoUrl, '', '', '', 'Hadir']);
    } else if (isIjin) {
      // Ijin: 1x isi form sudah cukup.
      // JAM MASUK = jam submit (jam lapor ijin), FOTO MASUK = bukti foto ijin.
      pSheet.appendRow([tanggalNorm, pId, pNamaAsli, lokasi, jamSubmit, fotoUrl, '', '', '', '', '', statusLabel]);
    }
  }
}

// ============================================================

