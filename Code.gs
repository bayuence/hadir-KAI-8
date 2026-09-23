// ============================================================
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
  FONNTE_TOKEN:       '3JNJWubZzxikGcyXDePx',

  // Konfigurasi Meta WhatsApp Cloud API (Optional Legacy)
  WA_PHONE_NUMBER_ID: 'ISI_PHONE_NUMBER_ID_META_DISINI',
  WA_ACCESS_TOKEN:    'ISI_ACCESS_TOKEN_META_DISINI',
  WA_TEMPLATE_NAME:   'hello_world' // Default template dari Meta untuk testing awal
};

// ─── ENTRY POINT (WEB APP API) ───────────────────────────────
// ─── ENTRY POINT (WEB APP API) ───────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  var isLocked = false;
  try {
    var data   = JSON.parse(e.postData.contents || '{}');
    var action = data.action;
    var result;

    // Aksi yang mengubah/menulis data ke Google Sheets -> Butuh Lock antrean agar tidak bentrok
    var needsLock = [
      'checkIn', 'checkOut', 'daftar', 'ajukanIzin',
      'approveUser', 'rejectUser', 'approveIzin', 'rejectIzin',
      'savePenugasan', 'deletePenugasan', 'assignLokasi',
      'saveUserAdmin', 'deleteUserAdmin', 'toggleAdminRole',
      'selfAssignLokasi'
    ].indexOf(action) !== -1;

    if (needsLock) {
      isLocked = lock.tryLock(20000); // Maksimal tunggu antrean 20 detik
      if (!isLocked) {
        return respond({ 
          success: false, 
          message: 'Server sedang memproses antrean presensi lain. Aplikasi akan mencoba lagi otomatis...', 
          isQueueBusy: true 
        });
      }
    }

    switch (action) {
      case 'getPesertaList':    result = handleGetPesertaList(data);    break;
      case 'login':             result = handleLogin(data);             break;
      case 'daftar':            result = handleDaftar(data);            break;
      case 'getStatusHariIni':  result = handleGetStatusHariIni(data);  break;
      case 'checkIn':           result = handleCheckIn(data);           break;
      case 'checkOut':          result = handleCheckOut(data);          break;
      case 'getRiwayat':        result = handleGetRiwayat(data);        break;
      case 'getProfile':         result = handleGetProfile(data);        break;
      case 'ajukanIzin':        result = handleAjukanIzin(data);        break;
      case 'getIzinSaya':       result = handleGetIzinSaya(data);       break;
      case 'getDashboardAdmin': result = handleGetDashboardAdmin(data); break;
      case 'getPendingUsers':   result = handleGetPendingUsers(data);   break;
      case 'approveUser':       result = handleApproveUser(data);       break;
      case 'rejectUser':        result = handleRejectUser(data);        break;
      case 'getAllPresensi':    result = handleGetAllPresensi(data);    break;
      case 'getPendingIzin':    result = handleGetPendingIzin(data);    break;
      case 'approveIzin':       result = handleApproveIzin(data);       break;
      case 'rejectIzin':        result = handleRejectIzin(data);        break;
      case 'getPenugasan':      result = handleGetPenugasan(data);      break;
      case 'savePenugasan':     result = handleSavePenugasan(data);     break;
      case 'deletePenugasan':   result = handleDeletePenugasan(data);   break;
      case 'assignLokasi':         result = handleAssignLokasi(data);         break;
      case 'getPenugasanPublic':    result = handleGetPenugasanPublic(data);    break;
      case 'selfAssignLokasi':      result = handleSelfAssignLokasi(data);      break;
      case 'getAllUsersAdmin':       result = handleGetAllUsersAdmin(data);       break;
      case 'saveUserAdmin':          result = handleSaveUserAdmin(data);          break;
      case 'deleteUserAdmin':        result = handleDeleteUserAdmin(data);        break;
      case 'toggleAdminRole':        result = handleToggleAdminRole(data);        break;
      case 'broadcastPengingatWA':
        if (!isAdminValid(data.adminToken)) {
          result = { success: false, message: 'Token admin invalid.' };
        } else {
          var tipeBroadcast = data.tipe || 'masuk';
          if (tipeBroadcast === 'pulang') {
            result = kirimPengingatPresensiPulang(true);
          } else {
            result = kirimPengingatPresensiMasuk(true);
          }
        }
        break;
      default: result = { success: false, message: 'Action tidak dikenal' };
    }
    return respond(result);
  } catch (err) {
    return respond({ success: false, message: 'Server error: ' + err.message });
  } finally {
    if (isLocked) {
      try {
        SpreadsheetApp.flush(); // Pastikan perubahan tersimpan ke Google Sheets sebelum kunci dilepas
        lock.releaseLock();
      } catch (eLock) {}
    }
  }
}

function doGet(e) {
  if (e.parameter.action === 'getPesertaList') return respond(handleGetPesertaList({}));
  return respond({ success: false, message: 'Method tidak didukung' });
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

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
// FITUR BARU: MIGRASI & REALTIME SYNC (JALANKAN SEKALI SAJA)
// ============================================================

// ─── JALANKAN INI JIKA SEBELUMNYA SUDAH TERLANJUR BUAT BANYAK SHEET ──
function bersihkanSheetLama() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var deleted = 0;
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    // Hapus semua sheet yang namanya "WEB Data Sheet MGGNG-..."
    if (name.indexOf('WEB Data Sheet MGGNG-') === 0) {
      ss.deleteSheet(sheets[i]);
      deleted++;
    }
  }
  Logger.log('Berhasil hapus ' + deleted + ' sheet lama.');
}

// ─── JALANKAN INI SATU KALI UNTUK SETUP LENGKAP ──────────────
function setupPeralihanAwal() {
  bersihkanSheetLama();  // Hapus sheet per-orang yang lama
  setupDropdownRole();
  migrasiDataAwal();
  setupRealtimeSync();
  setupAutoSync();       // Pasang sinkronisasi harian otomatis
  Logger.log("Semua setup selesai!");
}

function setupDropdownRole() {
  var sheet = getOrCreateSheet('WEB Register');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp Submit','Nama Lengkap','Tanggal Lahir','Alamat','No HP','Email',
      'Kampus','Jurusan','Tanggal Mulai','Tanggal Selesai','Foto Profil URL',
      'Status Akun','Role','ID Lokasi','ID Unik']);
  }
  
  // Dropdown untuk kolom M (Role)
  var roleRule = SpreadsheetApp.newDataValidation().requireValueInList(['admin', 'intern'], true).build();
  sheet.getRange('M2:M').setDataValidation(roleRule);
  
  // Format kolom C (Tanggal Lahir) sebagai teks @
  // dan beri note cara mengisi
  sheet.getRange('C1').setNote('Format: DD/MM/YYYY\nContoh: 01/08/2003');
  sheet.getRange('C2:C').setNumberFormat('@'); // format teks agar tidak dikonversi otomatis oleh Sheets
  
  // Warna header kolom C agar mudah dikenali
  sheet.getRange('C1').setBackground('#fef3c7').setFontWeight('bold');
  
  Logger.log("Dropdown Role & format Tanggal Lahir selesai dibuat.");
}

// ── Fungsi bantu: set tanggal lahir satu orang (jalankan manual jika perlu) ──
// Ganti 'BAYU NURCAHYO' dan '10/08/2003' sesuai kebutuhan
function setTanggalLahirManual() {
  var nama = 'BAYU NURCAHYO'; // ganti nama
  var tgl  = '10/08/2003';    // ganti tanggal lahir format DD/MM/YYYY
  
  var sheet = getSheet('WEB Register');
  if (!sheet) { Logger.log('WEB Register tidak ditemukan'); return; }
  
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1].toLowerCase().trim() === nama.toLowerCase().trim()) {
      sheet.getRange(i + 1, 3).setValue(tgl);
      Logger.log('Tanggal lahir ' + nama + ' berhasil diset ke ' + tgl);
      return;
    }
  }
  Logger.log('Nama tidak ditemukan: ' + nama);
}

// ── Fungsi bantu: jadikan seseorang sebagai admin ──
function jadikanAdmin() {
  var nama = 'BAYU NURCAHYO'; // ganti nama
  
  var sheet = getSheet('WEB Register');
  if (!sheet) { Logger.log('WEB Register tidak ditemukan'); return; }
  
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1].toLowerCase().trim() === nama.toLowerCase().trim()) {
      sheet.getRange(i + 1, 13).setValue('admin');
      Logger.log(nama + ' berhasil dijadikan admin!');
      return;
    }
  }
  Logger.log('Nama tidak ditemukan: ' + nama);
}


// ── EKSTRAK ID FILE DARI URL GOOGLE DRIVE ─────────────────────
function extractDriveId(url) {
  if (!url) return '';
  // Format: https://drive.google.com/open?id=FILE_ID
  var m1 = url.match(/[?&]id=([^&]+)/);
  if (m1) return m1[1];
  // Format: https://drive.google.com/file/d/FILE_ID/view
  var m2 = url.match(/\/file\/d\/([^\/]+)/);
  if (m2) return m2[1];
  return '';
}

// ── JALANKAN SEKALI SETELAH migrasiDataAwal ───────────────────
// Menambahkan kolom PREVIEW MASUK (M) & PREVIEW PULANG (N)
// dengan formula =IMAGE() dari URL di kolom F dan H
function tambahPreviewFoto() {
  var pSheet = getSheet('WEB Presensi');
  if (!pSheet) { Logger.log('WEB Presensi tidak ditemukan'); return; }
  
  var lastRow = pSheet.getLastRow();
  if (lastRow < 2) { Logger.log('Tidak ada data'); return; }
  
  // Pastikan header ada di kolom M dan N
  pSheet.getRange('M1').setValue('PREVIEW MASUK');
  pSheet.getRange('N1').setValue('PREVIEW PULANG');
  
  // Set baris cukup tinggi untuk preview foto
  pSheet.setRowHeightsForced(2, lastRow - 1, 80);
  
  var data = pSheet.getDataRange().getDisplayValues();
  var fomulasMasuk = [];
  var formulasPulang = [];
  
  for (var i = 1; i < data.length; i++) {
    var fotoMasuk  = data[i][5] || ''; // Kolom F = FOTO MASUK
    var fotoPulang = data[i][7] || ''; // Kolom H = FOTO PULANG
    
    var idM = extractDriveId(fotoMasuk);
    var idP = extractDriveId(fotoPulang);
    
    fomulasMasuk.push([idM ? '=IMAGE("https://drive.google.com/thumbnail?id=' + idM + '&sz=w200")' : '']);
    formulasPulang.push([idP ? '=IMAGE("https://drive.google.com/thumbnail?id=' + idP + '&sz=w200")' : '']);
  }
  
  pSheet.getRange(2, 13, fomulasMasuk.length, 1).setFormulas(fomulasMasuk);
  pSheet.getRange(2, 14, formulasPulang.length, 1).setFormulas(formulasPulang);
  
  Logger.log('Preview foto berhasil ditambahkan! Total baris: ' + (lastRow - 1));
}


// ── MIGRASI ULANG DATA REGISTRASI LENGKAP ──────────────────────
function migrasiDataRegistrasiLengkap() {
  var oldReg = getSheet('Data Registrasi');
  var webReg = getSheet('WEB Register');
  if (!oldReg || !webReg) {
    Logger.log("Sheet tidak ditemukan.");
    return;
  }
  
  var oldData = oldReg.getDataRange().getDisplayValues();
  var webData = webReg.getDataRange().getDisplayValues();
  
  if (oldData.length <= 1 || webData.length <= 1) return;
  
  var oldHeaders = oldData[0].map(function(h) { return String(h).toLowerCase().trim(); });
  
  // Deteksi index kolom di Data Registrasi lama (berdasarkan screenshot)
  var idxAlamat  = oldHeaders.indexOf('alamat tempat tinggal');
  var idxHp      = oldHeaders.indexOf('nomor handphone');
  var idxEmail   = oldHeaders.indexOf('email');
  var idxKampus  = oldHeaders.indexOf('nama universitas');
  var idxJurusan = oldHeaders.indexOf('jurusan');
  var idxMulai   = oldHeaders.indexOf('tanggal mulai magang');
  var idxSelesai = oldHeaders.indexOf('tanggal selesai magang');
  var idxFoto    = oldHeaders.indexOf('foto terbaru');
  
  var updateCount = 0;
  
  // Looping baris di WEB Register
  for (var i = 1; i < webData.length; i++) {
    var namaWeb = String(webData[i][1]).toLowerCase().trim();
    if (!namaWeb) continue;
    
    // Cari nama yang sama di Data Registrasi
    for (var j = 1; j < oldData.length; j++) {
      var namaOld = String(oldData[j][1]).toLowerCase().trim();
      if (namaWeb === namaOld) {
        
        // Update data di WEB Register 
        if (idxAlamat > -1)  webReg.getRange(i + 1, 4).setValue(oldData[j][idxAlamat]); // Alamat
        if (idxHp > -1)      webReg.getRange(i + 1, 5).setValue(oldData[j][idxHp]);     // No HP
        if (idxEmail > -1)   webReg.getRange(i + 1, 6).setValue(oldData[j][idxEmail]);  // Email
        if (idxKampus > -1)  webReg.getRange(i + 1, 7).setValue(oldData[j][idxKampus]); // Kampus
        if (idxJurusan > -1) webReg.getRange(i + 1, 8).setValue(oldData[j][idxJurusan]); // Jurusan
        if (idxMulai > -1)   webReg.getRange(i + 1, 9).setValue(oldData[j][idxMulai]);  // Tgl Mulai
        if (idxSelesai > -1) webReg.getRange(i + 1, 10).setValue(oldData[j][idxSelesai]);// Tgl Selesai
        
        // Ekstrak URL foto Drive jika ada
        if (idxFoto > -1 && oldData[j][idxFoto]) {
          var idFoto = extractDriveId(oldData[j][idxFoto]);
          if (idFoto) {
            webReg.getRange(i + 1, 11).setValue("https://drive.google.com/uc?id=" + idFoto); // Foto URL khusus render
          }
        }
        
        updateCount++;
        break; // Lanjut ke peserta berikutnya di WEB Register
      }
    }
  }
  
  Logger.log("Berhasil melengkapi " + updateCount + " data peserta dari Data Registrasi lama.");
}

function migrasiDataAwal() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var webReg = getOrCreateSheet('WEB Register');
  var pSheet = getOrCreateSheet('WEB Presensi');
  
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }

  // 1. Migrasi Register (Versi Awal - dilewati jika sudah ada data)
  var oldReg = ss.getSheetByName('Data Registrasi');
  if (oldReg && webReg.getLastRow() <= 1) { 
    // Hanya basic id generation
    var rows = oldReg.getDataRange().getDisplayValues();
    for (var i = 1; i < rows.length; i++) {
      var nama = rows[i][1];
      if (!nama) continue;
      var newId = 'MGGNG-' + String(i).padStart(3, '0');
      webReg.appendRow([rows[i][0] || new Date().toISOString(), nama, '', rows[i][2] || '', '', '', '', '', '', '', '', 'active', 'intern', '', newId]);
    }
    Logger.log("Migrasi peserta selesai.");
  }

  // 2. Migrasi Presensi Lama -> ke SATU sheet 'WEB Presensi'
  // Hanya migrasi jika WEB Presensi masih kosong (cuma header)
  var oldRes = ss.getSheetByName('Form Responses 1');
  if (oldRes && pSheet.getLastRow() <= 1) {
    // Gunakan helper sinkron agar logik ijin sudah benar sejak awal
    _prosesFormResponsesToPresensi(oldRes, webReg, pSheet, true);
    Logger.log("Migrasi riwayat presensi selesai.");
  }
}

// ============================================================
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
    if (kNama) mapPeserta[kNama] = { id: allRegRows[k][14], nama: allRegRows[k][1] };
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
    var jamSubmit = v[0], nama = v[1], alamat = v[2], hp = v[3], email = v[4];
    var kampus = v[5], jurusan = v[6], tglMulai = v[7], tglSelesai = v[8];
    var fotoUrl = v[10] || ''; // FOTO TERBARU ada di index 10 (kolom K)
    
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
      jamSubmit || new Date().toISOString(), nama, '', alamat, hp, email, 
      kampus, jurusan, tglMulai, tglSelesai, fotoRender, 'active', 'intern', '', newId
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
      pId = regRows[i][14];
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
// FUNGSI AUTH & SESSION
// ============================================================

function isAdminValid(token) { return token === CONFIG.ADMIN_TOKEN; }

function validateSession(token) {
  if (!token) return null;
  var sheet = getOrCreateSheet('WEB Sessions');
  var data  = sheet.getDataRange().getDisplayValues();
  var now   = Date.now();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (now < Number(data[i][2])) return data[i][1];
      sheet.deleteRow(i + 1);
      return null;
    }
  }
  return null;
}

function createSession(idPeserta) {
  var token  = Utilities.getUuid();
  var expire = Date.now() + CONFIG.SESSION_EXPIRE;
  var sheet  = getOrCreateSheet('WEB Sessions');
  if (sheet.getLastRow() === 0) sheet.appendRow(['token', 'idPeserta', 'expired']);
  sheet.appendRow([token, idPeserta, expire]);
  return token;
}

// ============================================================
// IMPLEMENTASI ENDPOINT (WEB API)
// ============================================================

function handleGetPesertaList(data) {
  var forceFresh = data && data.forceFresh;
  var cache = CacheService.getScriptCache();
  if (!forceFresh) {
    var cached = cache.get('peserta_list_v1');
    if (cached) {
      try {
        return { success: true, data: JSON.parse(cached), fromCache: true };
      } catch (eCache) {}
    }
  }

  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] && rows[i][11] === 'active') {
      // Konversi URL foto ke format lh3 CDN Google untuk daftar peserta
      var fotoUrl = rows[i][10] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s200';
      }
      list.push({
        id:       rows[i][14],
        nama:     rows[i][1],
        idLokasi: rows[i][13] || '',
        foto:     fotoUrl
      });
    }
  }

  // Simpan cache selama 5 menit (300 detik) untuk menghemat pembacaan Spreadsheet saat lonjakan user
  try {
    cache.put('peserta_list_v1', JSON.stringify(list), 300);
  } catch (ePut) {}

  return { success: true, data: list };
}

function normalizeTanggalLahir(str) {
  if (!str) return '';
  var s = String(str).trim();
  var parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    var p1 = parseInt(parts[0], 10);
    var p2 = parseInt(parts[1], 10);
    var p3 = parseInt(parts[2], 10);
    if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return s;
    if (p1 > 1000) {
      // Format YYYY-MM-DD -> DD/MM/YYYY
      return (p3 < 10 ? '0' + p3 : '' + p3) + '/' + (p2 < 10 ? '0' + p2 : '' + p2) + '/' + p1;
    }
    // Format D/M/YYYY atau DD/MM/YYYY -> DD/MM/YYYY
    return (p1 < 10 ? '0' + p1 : '' + p1) + '/' + (p2 < 10 ? '0' + p2 : '' + p2) + '/' + p3;
  }
  return s;
}

function handleLogin(data) {
  var nama = data.nama, tglLahir = data.tanggalLahir;
  if (!nama || !tglLahir) return { success: false, message: 'Nama dan tanggal lahir harus diisi' };

  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Database WEB Register tidak ditemukan.' };

  var rows = sheet.getDataRange().getDisplayValues();
  var inputTglNorm = normalizeTanggalLahir(tglLahir);

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase().trim() === String(nama).toLowerCase().trim()) {
      var rowTgl = rows[i][2].trim();
      if (rowTgl === '') return { success: false, message: 'Tanggal lahir belum diatur oleh admin. Minta admin untuk mengaturnya di WEB Register.'};
      
      var rowTglNorm = normalizeTanggalLahir(rowTgl);
      if (rowTglNorm === inputTglNorm) {
        if (rows[i][11] === 'pending')  return { success: false, message: 'Akun Anda menunggu persetujuan admin.' };
        if (rows[i][11] === 'rejected') return { success: false, message: 'Akun Anda ditolak.' };
        if (rows[i][11] !== 'active')   return { success: false, message: 'Status akun tidak valid.' };
  
        var lat = null, lng = null, radius = 100, lokasiNama = rows[i][13], unitKerjaNama = '—';
        if (rows[i][13]) {
          var penSheet2 = getSheet('WEB Penugasan');
          if (penSheet2) {
            var penRows2 = penSheet2.getDataRange().getValues();
            var idInduk2 = '';
            for (var j = 1; j < penRows2.length; j++) {
              if (penRows2[j][0] === rows[i][13] && penRows2[j][1] === 'lokasi') {
                lokasiNama = penRows2[j][3];
                idInduk2 = penRows2[j][2];
                lat = parseFloat(penRows2[j][5]) || null;
                lng = parseFloat(penRows2[j][6]) || null;
                radius = parseInt(penRows2[j][7]) || 100;
                break;
              }
            }
            if (idInduk2) {
              for (var k = 1; k < penRows2.length; k++) {
                if (penRows2[k][0] === idInduk2 && penRows2[k][1] === 'unit_kerja') {
                  unitKerjaNama = penRows2[k][3];
                  break;
                }
              }
            }
          }
        }
  
        // Konversi URL foto ke format lh3 CDN Google
        // lh3.googleusercontent.com tidak butuh cookie/session, aman di semua browser & Safari
        var fotoLogin = rows[i][10] || '';
        if (fotoLogin) {
          var idFotoLogin = extractDriveId(fotoLogin);
          if (idFotoLogin) fotoLogin = 'https://lh3.googleusercontent.com/d/' + idFotoLogin + '=s400';
        }

        var token = createSession(rows[i][14]);
        return {
          success: true, token: token,
          user: { 
            id: rows[i][14], 
            nama: rows[i][1], 
            tanggalLahir: rows[i][2],
            alamat: rows[i][3],
            noHp: rows[i][4],
            email: rows[i][5],
            kampus: rows[i][6],
            jurusan: rows[i][7],
            mulaiMagang: rows[i][8],
            selesaiMagang: rows[i][9],
            role: rows[i][12] || 'intern', 
            lokasi: lokasiNama || 'Belum ditetapkan', 
            unitKerja: unitKerjaNama,
            lat: lat, 
            long: lng,
            radius: radius,
            foto: fotoLogin
          }
        };
      }
    }
  }
  return { success: false, message: 'Nama atau tanggal lahir tidak cocok.' };
}

function handleDaftar(data) {
  var sheet = getOrCreateSheet('WEB Register');
  var rows  = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === data.nama.trim().toLowerCase()) return { success: false, message: 'Nama sudah terdaftar.' };
  }
  if (sheet.getLastRow() === 0) setupDropdownRole();

  var fotoUrl = data.foto64 ? uploadFoto(data.foto64, 'profil_' + data.nama.replace(/\s/g,'_') + '_' + Date.now() + '.jpg') : '';
  sheet.appendRow([new Date().toISOString(), data.nama.trim(), data.tanggalLahir.trim(), data.alamat, data.noHp, data.email, data.kampus, data.jurusan, data.mulaiMagang || '', data.selesaiMagang || '', fotoUrl, 'active', 'intern', '', generatePesertaId()]);
  return { success: true, message: 'Pendaftaran berhasil! Silakan login.' };
}

function handleGetProfile(data) {
  var idPeserta = validateSession(data.token);
  if (!idPeserta) return { success: false, message: 'Sesi tidak valid.' };
  
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === idPeserta) {
      // Konversi URL foto ke format lh3 CDN Google
      // lh3.googleusercontent.com tidak butuh cookie/session, aman di semua browser & Safari
      var fotoUrl = rows[i][10] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s400';
      }
      
      var lat = null, lng = null, radius = 100, lokasiNama = rows[i][13], unitKerjaNama = '—';
      if (rows[i][13]) {
        var penSheet = getSheet('WEB Penugasan');
        if (penSheet) {
          var penRows = penSheet.getDataRange().getValues(); // Gunakan getValues() agar desimal koordinat tidak terpotong (rounded)
          var idInduk = '';
          for (var j = 1; j < penRows.length; j++) {
            if (penRows[j][0] === rows[i][13] && penRows[j][1] === 'lokasi') {
              lokasiNama = penRows[j][3];
              idInduk = penRows[j][2];
              lat = parseFloat(penRows[j][5]) || null;
              lng = parseFloat(penRows[j][6]) || null;
              radius = parseInt(penRows[j][7]) || 100;
              break;
            }
          }
          if (idInduk) {
            for (var k = 1; k < penRows.length; k++) {
              if (penRows[k][0] === idInduk && penRows[k][1] === 'unit_kerja') {
                unitKerjaNama = penRows[k][3];
                break;
              }
            }
          }
        }
      }
      
      return {
        success: true,
        data: {
          id: rows[i][14],
          nama: rows[i][1],
          tanggalLahir: rows[i][2],
          alamat: rows[i][3],
          noHp: rows[i][4],
          email: rows[i][5],
          kampus: rows[i][6],
          jurusan: rows[i][7],
          mulaiMagang: rows[i][8],
          selesaiMagang: rows[i][9],
          foto: fotoUrl,
          role: rows[i][12] || 'intern',
          lokasi: lokasiNama || 'Belum ditetapkan',
          unitKerja: unitKerjaNama,
          idLokasi: rows[i][13] || '',
          lat: lat,
          long: lng,
          radius: radius
        }
      };
    }
  }
  return { success: false, message: 'Profil tidak ditemukan.' };
}

function handleGetStatusHariIni(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var today = formatTanggal();
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null } };

  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    // Normalize kedua sisi agar format apapun bisa cocok
    if (normalizeTanggal(rows[i][0]) === normalizeTanggal(today) && rows[i][1] === data.idPeserta) {
      return { success: true, data: { sudahMasuk: !!rows[i][4], sudahPulang: !!rows[i][6], jamMasuk: rows[i][4] || null, jamPulang: rows[i][6] || null }};
    }
  }
  return { success: true, data: { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null } };
}

function handleCheckIn(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  
  var regRows  = getSheet('WEB Register').getDataRange().getDisplayValues();
  var peserta  = null;
  for (var i = 1; i < regRows.length; i++) if (regRows[i][14] === data.idPeserta) { peserta = regRows[i]; break; }
  
  var idLokasi = peserta[13];
  var namaLokasi = 'KANTOR DAOP';
  
  if (idLokasi) {
    namaLokasi = idLokasi; // Default to ID if not found
    var penSheet = getSheet('WEB Penugasan');
    if (penSheet) {
      var penRows = penSheet.getDataRange().getValues();
      for (var j = 1; j < penRows.length; j++) {
        if (penRows[j][0] === idLokasi && penRows[j][1] === 'lokasi') {
          namaLokasi = penRows[j][3];
          var latLokasi = parseFloat(penRows[j][5]);
          var lngLokasi = parseFloat(penRows[j][6]);
          var radiusLokasi = parseInt(penRows[j][7]) || CONFIG.GEOFENCE_RADIUS;
          
          if (!isNaN(latLokasi) && !isNaN(lngLokasi)) {
            var jarak  = hitungJarak(data.latitude, data.longitude, latLokasi, lngLokasi);
            if (jarak > radiusLokasi) return { success: false, message: 'Di luar area (' + Math.round(jarak) + 'm).' };
          }
          break;
        }
      }
    }
  }

  var today = formatTanggal();
  var dataSheet = getOrCreateSheet('WEB Presensi');
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }
  
  var dsRows = dataSheet.getDataRange().getValues();
  var todayNorm = normalizeTanggal(today);
  for (var k = dsRows.length - 1; k >= 1; k--) {
    // Normalize tanggal di sheet agar cocok dengan format apapun
    if (normalizeTanggal(dsRows[k][0]) === todayNorm && dsRows[k][1] === data.idPeserta && dsRows[k][4]) return { success: false, message: 'Sudah presensi masuk.' };
  }

  var jamMasuk = formatJam(data.timestamp ? new Date(data.timestamp) : new Date());
  var fotoUrl = data.foto64 ? uploadFoto(data.foto64, 'masuk_' + data.idPeserta + '_' + today.replace(/\//g,'-') + '.jpg') : '';

  dataSheet.appendRow([today, data.idPeserta, peserta[1], namaLokasi, jamMasuk, fotoUrl, '', '', '', data.latitude+','+data.longitude, '', 'Hadir']);
  return { success: true, jamMasuk: jamMasuk };
}

function handleCheckOut(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  var today = formatTanggal();
  var dataSheet = getSheet('WEB Presensi');
  if (!dataSheet) return { success: false, message: 'Belum presensi masuk.' };

  var rows = dataSheet.getDataRange().getValues();
  var targetRow = -1;
  var todayNormCO = normalizeTanggal(today);
  for (var i = rows.length - 1; i >= 1; i--) {
    // Normalize tanggal di kedua sisi agar berbagai format bisa cocok (DD/MM/YYYY vs M/D/YYYY)
    if (normalizeTanggal(rows[i][0]) === todayNormCO && rows[i][1] === data.idPeserta && rows[i][4] && !rows[i][6]) { targetRow = i + 1; break; }
  }
  if (targetRow === -1) return { success: false, message: 'Belum presensi masuk atau sudah pulang.' };

  var jamPulang = formatJam(data.timestamp ? new Date(data.timestamp) : new Date());
  var totalJam  = hitungTotalJam(String(rows[targetRow - 1][4]), jamPulang);
  var fotoUrl   = data.foto64 ? uploadFoto(data.foto64, 'pulang_' + data.idPeserta + '_' + today.replace(/\//g,'-') + '.jpg') : '';

  dataSheet.getRange(targetRow, 7).setValue(jamPulang);
  dataSheet.getRange(targetRow, 8).setValue(fotoUrl);
  dataSheet.getRange(targetRow, 9).setValue(totalJam);
  dataSheet.getRange(targetRow, 11).setValue(data.latitude + ',' + data.longitude);
  return { success: true, jamPulang: jamPulang, totalJam: totalJam };
}

function handleGetRiwayat(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: [] };
  
  var rows = sheet.getDataRange().getDisplayValues(), result = [];
  var no = 1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] === data.idPeserta) {
      // Normalisasi format tanggal agar konsisten (handle M/D/YYYY dari form lama)
      var tglNormal = normalizeTanggal(rows[i][0]);
      result.push({ no: no++, tanggal: tglNormal, lokasi: rows[i][3], jamMasuk: rows[i][4], fotoMasuk: rows[i][5], jamPulang: rows[i][6], fotoPulang: rows[i][7], totalJam: rows[i][8], gpsMasuk: rows[i][9], gpsPulang: rows[i][10], status: rows[i][11] });
    }
  }
  return { success: true, data: result.reverse() };
}

// ─── HANDLER IZIN ────────────────────────────────────────────
function mapJenisIzinKeStatus(jenis) {
  if (!jenis) return 'Ijin Lain';
  var j = String(jenis).toLowerCase().trim();
  if (j === 'sakit' || j === 'ijin sakit') return 'Ijin Sakit';
  if (j === 'kuliah' || j === 'ijin kampus' || j === 'ijin acara kampus') return 'Ijin Kampus';
  return 'Ijin Lain';
}

function handleAjukanIzin(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  if (!data.idPeserta) return { success: false, message: 'ID Peserta tidak valid.' };
  if (!data.tanggal) return { success: false, message: 'Tanggal izin harus diisi.' };

  var tglInputNorm = normalizeTanggal(data.tanggal);
  if (!tglInputNorm) return { success: false, message: 'Format tanggal tidak valid.' };

  // Cari data peserta di WEB Register
  var regSheet = getSheet('WEB Register');
  if (!regSheet) return { success: false, message: 'Database peserta tidak ditemukan.' };
  var regRows = regSheet.getDataRange().getDisplayValues();
  var pesertaNama = '', pesertaLokasi = 'Izin (Online)';
  for (var i = 1; i < regRows.length; i++) {
    if (regRows[i][14] === data.idPeserta) {
      pesertaNama = regRows[i][1];
      if (regRows[i][13]) pesertaLokasi = regRows[i][13];
      break;
    }
  }

  var dataSheet = getOrCreateSheet('WEB Presensi');
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }

  var dsRows = dataSheet.getDataRange().getValues();
  for (var k = dsRows.length - 1; k >= 1; k--) {
    if (normalizeTanggal(dsRows[k][0]) === tglInputNorm && dsRows[k][1] === data.idPeserta) {
      var st = (dsRows[k][11] || '').toLowerCase();
      if (st === 'hadir') return { success: false, message: 'Anda sudah presensi hadir pada tanggal tersebut.' };
      if (st.startsWith('ijin')) return { success: false, message: 'Anda sudah mengajukan izin pada tanggal tersebut.' };
    }
  }

  var statusMapped = mapJenisIzinKeStatus(data.jenis);
  var jamLapor = formatJam(new Date());
  var fotoUrl = data.foto64 ? uploadFoto(data.foto64, 'izin_' + data.idPeserta + '_' + tglInputNorm.replace(/\//g, '-') + '.jpg') : '';

  var lokasiField = data.keterangan ? (pesertaLokasi + ' (' + data.keterangan + ')') : pesertaLokasi;

  // Append ke WEB Presensi
  dataSheet.appendRow([tglInputNorm, data.idPeserta, pesertaNama, lokasiField, jamLapor, fotoUrl, '', '', '', '', '', statusMapped]);

  // Append ke WEB Izin
  var izinSheet = getOrCreateSheet('WEB Izin');
  if (izinSheet.getLastRow() === 0) {
    izinSheet.appendRow(['ID IZIN', 'ID PESERTA', 'NAMA', 'TANGGAL', 'JENIS', 'KETERANGAN', 'FOTO BUKTI', 'STATUS', 'TIMESTAMP']);
  }
  var idIzin = 'IZIN-' + Date.now();
  izinSheet.appendRow([idIzin, data.idPeserta, pesertaNama, tglInputNorm, data.jenis || 'Lainnya', data.keterangan || '', fotoUrl, 'approved', new Date().toISOString()]);

  return { success: true, message: 'Pengajuan izin berhasil dicatat.' };
}

function handleGetIzinSaya(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  
  var result = [];
  var seenKeys = {};

  // 1. Baca dari WEB Presensi terlebih dahulu (sumber utama termasuk histori form lama)
  var pSheet = getSheet('WEB Presensi');
  if (pSheet) {
    var pRows = pSheet.getDataRange().getDisplayValues();
    for (var j = 1; j < pRows.length; j++) {
      if (pRows[j][1] === data.idPeserta && pRows[j][11] && pRows[j][11].toLowerCase().startsWith('ijin')) {
        var tglNorm = normalizeTanggal(pRows[j][0]);
        var displayJenis = 'Lainnya';
        var stLower = pRows[j][11].toLowerCase();
        if (stLower.indexOf('sakit') !== -1) displayJenis = 'Sakit';
        else if (stLower.indexOf('kampus') !== -1 || stLower.indexOf('kuliah') !== -1) displayJenis = 'Kuliah';

        var key = tglNorm + '_' + data.idPeserta;
        seenKeys[key] = true;

        result.push({
          id: 'P-' + j,
          tanggal: tglNorm,
          jenis: displayJenis,
          keterangan: pRows[j][3] || '',
          fotoUrl: pRows[j][5] || '',
          status: 'approved'
        });
      }
    }
  }

  // 2. Tambahkan entri unik dari WEB Izin jika ada
  var izinSheet = getSheet('WEB Izin');
  if (izinSheet) {
    var rows = izinSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.idPeserta) {
        var tglNormIzin = normalizeTanggal(rows[i][3]);
        var keyIzin = tglNormIzin + '_' + data.idPeserta;
        if (!seenKeys[keyIzin]) {
          seenKeys[keyIzin] = true;
          result.push({
            id: rows[i][0],
            tanggal: tglNormIzin,
            jenis: rows[i][4],
            keterangan: rows[i][5],
            fotoUrl: rows[i][6],
            status: rows[i][7] || 'approved'
          });
        }
      }
    }
  }

  return { success: true, data: result.reverse() };
}

// ─── ADMIN ENDPOINTS (Dipendekkan) ───────────────────────────
function handleGetAllPresensi(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  if (!data.tanggal) return { success: false, message: 'Parameter tanggal diperlukan.' };

  var tglNorm   = normalizeTanggal(data.tanggal);
  var regSheet  = getSheet('WEB Register');
  var pSheet    = getSheet('WEB Presensi');
  var penSheet  = getSheet('WEB Penugasan');

  if (!regSheet) return { success: true, data: [] };

  // ── 1. Bangun map lokasi: idLokasi → namaLengkap (dari WEB Penugasan) ───
  // WEB Penugasan: [0]=ID, [1]=Tipe(unit_kerja/lokasi), [2]=ID_Induk, [3]=Nama, ...
  var namaLokasiMap = {};  // idLokasi -> 'Unit Kerja - Nama Lokasi'
  if (penSheet) {
    var penRows = penSheet.getDataRange().getDisplayValues();
    // Buat map unit kerja dulu: id -> nama
    var unitKerjaMap = {};
    for (var p = 1; p < penRows.length; p++) {
      if (String(penRows[p][1]).trim() === 'unit_kerja') {
        unitKerjaMap[String(penRows[p][0]).trim()] = String(penRows[p][3]).trim();
      }
    }
    // Buat map lokasi: idLokasi -> nama lengkap
    for (var q = 1; q < penRows.length; q++) {
      if (String(penRows[q][1]).trim() === 'lokasi') {
        var idLok   = String(penRows[q][0]).trim();
        var namaLok = String(penRows[q][3]).trim();
        var idUK    = String(penRows[q][2]).trim();
        var namaUK  = unitKerjaMap[idUK] || '';
        namaLokasiMap[idLok] = namaUK ? namaUK + ' - ' + namaLok : namaLok;
      }
    }
  }

  // ── 2. Bangun map presensi hari ini: idPeserta → row data ─────────────
  var presensiMap = {};
  if (pSheet) {
    var pRows = pSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < pRows.length; i++) {
      if (normalizeTanggal(pRows[i][0]) !== tglNorm) continue;
      var pid = String(pRows[i][1]).trim();
      if (!pid) continue;

      var fotoMasuk  = pRows[i][5]  || '';
      var fotoPulang = pRows[i][7]  || '';
      if (fotoMasuk)  { var idM = extractDriveId(fotoMasuk);  if (idM)  fotoMasuk  = 'https://drive.google.com/thumbnail?id=' + idM  + '&sz=w200'; }
      if (fotoPulang) { var idP = extractDriveId(fotoPulang); if (idP)  fotoPulang = 'https://drive.google.com/thumbnail?id=' + idP  + '&sz=w200'; }

      var status = pRows[i][11] || 'Hadir';
      presensiMap[pid] = {
        jamMasuk:   pRows[i][4]  || null,
        fotoMasuk:  fotoMasuk    || null,
        jamPulang:  pRows[i][6]  || null,
        fotoPulang: fotoPulang   || null,
        totalJam:   pRows[i][8]  || '',
        gpsMasuk:   pRows[i][9]  || '',
        gpsPulang:  pRows[i][10] || '',
        lokasiPresensi: pRows[i][3] || '',
        status:     status
      };
    }
  }

  // ── 3. Iterasi SEMUA peserta aktif dari WEB Register ──────────────────
  var regRows = regSheet.getDataRange().getDisplayValues();
  var result  = [];

  for (var r = 1; r < regRows.length; r++) {
    var statusAkun = String(regRows[r][11]).trim().toLowerCase();
    if (statusAkun !== 'active') continue; // Skip pending/rejected

    var idPeserta   = String(regRows[r][14]).trim();
    var namaPeserta = String(regRows[r][1]).trim();
    var noHp        = String(regRows[r][4] || '').trim().replace(/^0/, '62'); // format internasional
    var fotoProfil  = String(regRows[r][10] || '').trim();
    // col[13] di WEB Register = ID Lokasi yang ditetapkan admin
    var idLokasiPeserta = String(regRows[r][13] || '').trim();
    var penempatan      = idLokasiPeserta ? (namaLokasiMap[idLokasiPeserta] || idLokasiPeserta) : '';

    var pData = presensiMap[idPeserta];

    if (pData) {
      // Peserta punya data presensi hari ini
      var lokasiTampil = pData.lokasiPresensi || penempatan || 'Kantor Daop 8';
      result.push({
        id:         idPeserta,
        nama:       namaPeserta,
        foto:       fotoProfil,
        noHp:       noHp,
        lokasi:     lokasiTampil,
        penempatan: penempatan,
        jamMasuk:   pData.jamMasuk,
        fotoMasuk:  pData.fotoMasuk,
        jamPulang:  pData.jamPulang,
        fotoPulang: pData.fotoPulang,
        totalJam:   pData.totalJam,
        gpsMasuk:   pData.gpsMasuk,
        gpsPulang:  pData.gpsPulang,
        status:     pData.status
      });
    } else {
      // Peserta tidak ada data presensi → Alfa
      result.push({
        id:         idPeserta,
        nama:       namaPeserta,
        foto:       fotoProfil,
        noHp:       noHp,
        lokasi:     penempatan || 'Kantor Daop 8',
        penempatan: penempatan,
        jamMasuk:   null,
        fotoMasuk:  null,
        jamPulang:  null,
        fotoPulang: null,
        totalJam:   '',
        gpsMasuk:   '',
        gpsPulang:  '',
        status:     'Alfa'
      });
    }
  }

  // ── 4. Sort: BlmPulang → Hadir → Ijin → Alfa ────────────────────────
  var order = function(p) {
    if (p.status === 'Hadir' && p.jamMasuk && !p.jamPulang) return 0; // Blm Pulang duluan
    if (p.status === 'Hadir') return 1;
    if (p.status && p.status.indexOf('Ijin') === 0) return 2;
    if (p.status === 'Alfa') return 3;
    return 4;
  };
  result.sort(function(a, b) { return order(a) - order(b); });

  return { success: true, data: result };
}


function handleGetDashboardAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var today = formatTanggal(), regSheet = getSheet('WEB Register'), pSheet = getSheet('WEB Presensi');
  var hadir = 0, izin = 0, tidakHadir = 0, pending = 0, total = 0;
  
  if (regSheet) {
    var rows = regSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][11] === 'pending') { pending++; continue; }
      if (rows[i][11] !== 'active') continue;
      total++;
      var isHadir = false, isIzin = false;
      if (pSheet) {
        var pRows = pSheet.getDataRange().getDisplayValues();
        for (var j = pRows.length - 1; j >= 1; j--) {
          if (pRows[j][0] === today && pRows[j][1] === rows[i][14]) {
            if (pRows[j][11] === 'Izin') isIzin = true; else isHadir = true;
            break;
          }
        }
      }
      if (isIzin) izin++; else if (isHadir) hadir++; else tidakHadir++;
    }
  }
  return { success: true, data: { hadir: hadir, izin: izin, tidakHadir: tidakHadir, pending: pending, total: total } };
}

function handleGetPendingUsers(data) {
  if (!isAdminValid(data.adminToken)) return { success: false };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getDisplayValues(), result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][11] === 'pending') result.push({ id: rows[i][14], nama: rows[i][1], tanggalLahir: rows[i][2], kampus: rows[i][6], jurusan: rows[i][7] });
  }
  return { success: true, data: result };
}

function handleApproveUser(data) {
  if (!isAdminValid(data.adminToken)) return { success: false };
  var sheet = getSheet('WEB Register');
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === data.idPeserta) {
      sheet.getRange(i + 1, 12).setValue('active');
      sheet.getRange(i + 1, 14).setValue(data.idLokasi || '');
      return { success: true, message: 'Disetujui.' };
    }
  }
  return { success: false };
}

function handleRejectUser(data) {
  return handleDeleteUserAdmin(data);
}

function handleGetAllUsersAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getDisplayValues(), result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][1]) continue; // skip empty rows
    var fotoUrl = rows[i][10] || '';
    if (fotoUrl) {
      var idFoto = extractDriveId(fotoUrl);
      if (idFoto) fotoUrl = 'https://drive.google.com/thumbnail?id=' + idFoto + '&sz=w200';
    }
    result.push({
      id: rows[i][14],
      nama: rows[i][1],
      tanggalLahir: rows[i][2],
      alamat: rows[i][3],
      noHp: rows[i][4],
      email: rows[i][5],
      kampus: rows[i][6],
      jurusan: rows[i][7],
      mulaiMagang: rows[i][8],
      selesaiMagang: rows[i][9],
      foto: fotoUrl,
      status: rows[i][11] || 'active',
      role: rows[i][12] || 'intern',
      idLokasi: rows[i][13] || ''
    });
  }
  return { success: true, data: result };
}

function handleSaveUserAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  var rows = sheet.getDataRange().getDisplayValues();
  
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][14] === data.id) {
        if (data.nama !== undefined) sheet.getRange(i + 1, 2).setValue(data.nama.trim());
        if (data.tanggalLahir !== undefined) sheet.getRange(i + 1, 3).setValue(data.tanggalLahir.trim());
        if (data.alamat !== undefined) sheet.getRange(i + 1, 4).setValue(data.alamat);
        if (data.noHp !== undefined) sheet.getRange(i + 1, 5).setValue(data.noHp);
        if (data.email !== undefined) sheet.getRange(i + 1, 6).setValue(data.email);
        if (data.kampus !== undefined) sheet.getRange(i + 1, 7).setValue(data.kampus);
        if (data.jurusan !== undefined) sheet.getRange(i + 1, 8).setValue(data.jurusan);
        if (data.mulaiMagang !== undefined) sheet.getRange(i + 1, 9).setValue(data.mulaiMagang);
        if (data.selesaiMagang !== undefined) sheet.getRange(i + 1, 10).setValue(data.selesaiMagang);
        if (data.status !== undefined) sheet.getRange(i + 1, 12).setValue(data.status);
        if (data.role !== undefined) sheet.getRange(i + 1, 13).setValue(data.role);
        if (data.idLokasi !== undefined) sheet.getRange(i + 1, 14).setValue(data.idLokasi);
        return { success: true, message: 'Data peserta berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Peserta tidak ditemukan.' };
  } else {
    var newId = generatePesertaId();
    sheet.appendRow([
      new Date().toISOString(),
      data.nama.trim(),
      data.tanggalLahir.trim(),
      data.alamat || '',
      data.noHp || '',
      data.email || '',
      data.kampus || '',
      data.jurusan || '',
      data.mulaiMagang || '',
      data.selesaiMagang || '',
      '', // fotoUrl kosong dulu dari admin
      data.status || 'active',
      data.role || 'intern',
      data.idLokasi || '',
      newId
    ]);
    return { success: true, message: 'Peserta baru berhasil ditambahkan.' };
  }
}

function handleDeleteUserAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === data.idPeserta) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Peserta berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Peserta tidak ditemukan.' };
}

function handleToggleAdminRole(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === data.idPeserta) {
      var newRole = data.role === 'admin' ? 'admin' : 'intern';
      sheet.getRange(i + 1, 13).setValue(newRole);
      return { success: true, message: 'Role berhasil diubah menjadi ' + newRole + '.' };
    }
  }
  return { success: false, message: 'Peserta tidak ditemukan.' };
}

// ─── UTILITIES KECIL ─────────────────────────────────────────
function hitungJarak(lat1, lon1, lat2, lon2) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function uploadFoto(base64Data, filename) {
  try {
    var clean = base64Data.indexOf(',') > -1 ? base64Data.split(',')[1] : base64Data;
    var folder;
    if (CONFIG.FOLDER_FOTO_ID && CONFIG.FOLDER_FOTO_ID !== 'ISI_ID_FOLDER_DRIVE_FOTO') {
      try { folder = DriveApp.getFolderById(CONFIG.FOLDER_FOTO_ID); } catch(e) { folder = DriveApp.getRootFolder(); }
    } else {
      folder = DriveApp.getRootFolder();
    }
    var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(clean), 'image/jpeg', filename));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch(err) { return ''; }
}

function formatTanggal(dateStr) {
  var d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) { // Jika bukan format date valid, kembalikan string aslinya
    if (typeof dateStr === 'string' && dateStr.includes('/')) return dateStr;
    d = new Date();
  }
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

// Normalisasi berbagai format tanggal ke DD/MM/YYYY
// Handle: Date Object, "DD/MM/YYYY" (lokal web app), "M/D/YYYY" (Google Sheets US locale)
function normalizeTanggal(tglStr) {
  if (!tglStr) return '';
  if (tglStr instanceof Date) {
    var dayObj = tglStr.getDate();
    var monthObj = tglStr.getMonth() + 1;
    var yearObj = tglStr.getFullYear();
    return String(dayObj).padStart(2, '0') + '/' + String(monthObj).padStart(2, '0') + '/' + yearObj;
  }
  var s = String(tglStr).trim();

  // ── Handle format ISO: YYYY-MM-DD (dari HTML date input / frontend) ──
  var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return isoMatch[3] + '/' + isoMatch[2] + '/' + isoMatch[1]; // → DD/MM/YYYY
  }

  var parts = s.split('/');
  if (parts.length !== 3) return s;

  var p0 = parts[0], p1 = parts[1], p2 = parts[2];
  var n0 = parseInt(p0), n1 = parseInt(p1), n2 = parseInt(p2);

  var day, month, year;

  if (n0 > 12) {
    // Pasti DD/MM/YYYY (hari tidak mungkin bulan)
    day = n0; month = n1; year = n2;
  } else if (n1 > 12) {
    // Pasti M/D/YYYY format AS (hari di tengah, bulan di depan)
    month = n0; day = n1; year = n2;
  } else if (p0.length === 2 && p0.charAt(0) === '0') {
    // Zero-padded "01" → pasti dari web app → DD/MM/YYYY
    day = n0; month = n1; year = n2;
  } else if (p1.length === 2 && p1.charAt(0) === '0') {
    // "9/01/..." → hari-nya zero-padded → M/DD? Tetap default DD/MM
    day = n0; month = n1; year = n2;
  } else {
    // Ambiguous (e.g. "9/1/2026"): 
    // Data dari Google Form lama biasanya tidak zero-padded → asumsi M/D/YYYY
    // Data dari web app baru selalu zero-padded sehingga sudah tertangani di atas
    month = n0; day = n1; year = n2;
  }

  // Validasi hasil: jika hari atau bulan tidak masuk akal, kembalikan aslinya
  if (day < 1 || day > 31 || month < 1 || month > 12) return s;

  return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year;
}




function formatJam(dateObj) {
  if (!dateObj) return '';
  // Jika sudah berbentuk string HH:MM:SS, langsung kembalikan
  if (typeof dateObj === 'string' && dateObj.includes(':')) {
    var parts = dateObj.split(' ');
    var timePart = parts[parts.length - 1]; // Mengambil "08:01:54" dari "25/06/2026 08:01:54"
    return timePart;
  }
  var d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'), String(d.getSeconds()).padStart(2, '0')].join(':');
}

function hitungTotalJam(jamMasuk, jamPulang) {
  if (!jamMasuk || !jamPulang || jamMasuk === '' || jamPulang === '') return '';
  try {
    // Support format HH:MM dan HH:MM:SS
    var pm = String(jamMasuk).trim().split(':').map(Number);
    var pp = String(jamPulang).trim().split(':').map(Number);
    if (pm.length < 2 || pp.length < 2) return '';
    // Validasi NaN — jika ada elemen NaN, kembalikan kosong
    if (isNaN(pm[0]) || isNaN(pm[1]) || isNaN(pp[0]) || isNaN(pp[1])) return '';

    // Hitung selisih dalam detik (inklusif detik jika format HH:MM:SS)
    var detikMasuk  = pm[0] * 3600 + pm[1] * 60 + (pm[2] || 0);
    var detikPulang = pp[0] * 3600 + pp[1] * 60 + (pp[2] || 0);
    var selisihDetik = detikPulang - detikMasuk;
    if (selisihDetik <= 0) return '0j 0m 0d';

    var j = Math.floor(selisihDetik / 3600);
    var m = Math.floor((selisihDetik % 3600) / 60);
    var d = selisihDetik % 60;
    return j + 'j ' + m + 'm ' + d + 'd';
  } catch(e) {
    return ''; // Jika format gagal, kembalikan kosong agar tidak error merah
  }
}

// ─── MANAJEMEN UNIT KERJA & LOKASI (HIERARKI 1 SHEET) ────────
// Sheet: WEB Penugasan
// Kolom: A=ID, B=Tipe(unit_kerja/lokasi), C=ID Induk, D=Nama, E=Alamat, F=Latitude, G=Longitude, H=Radius

function getOrCreatePenugasanSheet() {
  var sheet = getOrCreateSheet('WEB Penugasan');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Tipe', 'ID Induk', 'Nama', 'Alamat', 'Latitude', 'Longitude', 'Radius (Meter)']);
    // Seed data contoh KAI Daop 8
    sheet.appendRow(['UK-001', 'unit_kerja', '', 'Unit Operasi', '', '', '', '']);
    sheet.appendRow(['UK-002', 'unit_kerja', '', 'Unit Sinyal & Telekomunikasi', '', '', '', '']);
    sheet.appendRow(['UK-003', 'unit_kerja', '', 'Unit Traksi', '', '', '', '']);
    sheet.appendRow(['LOK-001', 'lokasi', 'UK-001', 'Kantor Daop 8 Surabaya', 'Jl. Pasarturi No.1, Surabaya', '-7.2484', '112.7360', 100]);
    sheet.appendRow(['LOK-002', 'lokasi', 'UK-001', 'Stasiun Surabaya Gubeng', 'Jl. Stasiun Gubeng, Surabaya', '-7.2654', '112.7523', 250]);
    sheet.appendRow(['LOK-003', 'lokasi', 'UK-001', 'Dipo Lokomotif Sidotopo', 'Sidotopo, Surabaya', '-7.2351', '112.7612', 500]);
  }
  return sheet;
}

function handleGetPenugasan(data) {
  var sheet = getOrCreatePenugasanSheet();
  var rows = sheet.getDataRange().getValues(); // Gunakan getValues() agar angka koordinat tidak dibulatkan jadi 4 desimal
  var unitList = [], lokasiList = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][1] === 'unit_kerja') {
      unitList.push({ id: rows[i][0], tipe: 'unit_kerja', nama: rows[i][3] });
    } else if (rows[i][1] === 'lokasi') {
      lokasiList.push({
        id: rows[i][0], tipe: 'lokasi', idInduk: rows[i][2], nama: rows[i][3],
        alamat: rows[i][4],
        lat: parseFloat(rows[i][5]) || null,
        lng: parseFloat(rows[i][6]) || null,
        radius: parseInt(rows[i][7]) || 100
      });
    }
  }
  return { success: true, data: { unitList: unitList, lokasiList: lokasiList } };
}

function handleSavePenugasan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  if (!data.nama) return { success: false, message: 'Nama harus diisi.' };
  if (!data.tipe) return { success: false, message: 'Tipe harus diisi (unit_kerja / lokasi).' };

  var sheet = getOrCreatePenugasanSheet();
  var rows = sheet.getDataRange().getDisplayValues();

  // UPDATE jika ID sudah ada
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 4).setValue(data.nama);
        sheet.getRange(i + 1, 5).setValue(data.alamat || '');
        // Tambahkan petik (') agar Sheets menyimpannya sebagai teks murni (Plain Text)
        // Ini mencegah bug locale Indonesia yang mengubah titik menjadi pemisah ribuan
        sheet.getRange(i + 1, 6).setValue(data.lat ? "'" + data.lat : '');
        sheet.getRange(i + 1, 7).setValue(data.lng ? "'" + data.lng : '');
        sheet.getRange(i + 1, 8).setValue(data.radius || '');
        return { success: true, message: 'Data berhasil diperbarui.' };
      }
    }
  }

  // INSERT baru
  var prefix = data.tipe === 'unit_kerja' ? 'UK' : 'LOK';
  var newId = prefix + '-' + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([
    newId, data.tipe, data.idInduk || '', data.nama,
    data.alamat || '', 
    data.lat ? "'" + data.lat : '', 
    data.lng ? "'" + data.lng : '', 
    data.radius || ''
  ]);
  return { success: true, message: 'Data berhasil ditambahkan.', id: newId };
}

function handleDeletePenugasan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  if (!data.id) return { success: false, message: 'ID tidak valid.' };

  var sheet = getOrCreatePenugasanSheet();
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      // Jika menghapus unit_kerja, hapus juga semua lokasi anaknya
      if (rows[i][1] === 'unit_kerja') {
        for (var j = rows.length - 1; j >= 1; j--) {
          if (rows[j][2] === data.id) sheet.deleteRow(j + 1);
        }
      }
      // Cari ulang baris yang dihapus setelah loop di atas mungkin mengubah index
      var freshRows = sheet.getDataRange().getDisplayValues();
      for (var k = 1; k < freshRows.length; k++) {
        if (freshRows[k][0] === data.id) { sheet.deleteRow(k + 1); break; }
      }
      return { success: true, message: 'Data berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Data tidak ditemukan.' };
}

function handleAssignLokasi(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  if (!data.idPeserta || !data.idLokasi) return { success: false, message: 'Peserta dan Lokasi harus dipilih.' };

  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet WEB Register tidak ditemukan.' };

  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === data.idPeserta) {
      sheet.getRange(i + 1, 14).setValue(data.idLokasi);
      return { success: true, message: 'Penempatan lokasi peserta berhasil diperbarui.' };
    }
  }
  return { success: false, message: 'Peserta tidak ditemukan.' };
}

function handleGetAllUsersAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1]) {
      var fotoUrl = rows[i][10] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s200';
      }
      list.push({
        id:            rows[i][14],
        nama:          rows[i][1],
        tanggalLahir:  rows[i][2],
        alamat:        rows[i][3],
        noHp:          rows[i][4],
        email:         rows[i][5],
        kampus:        rows[i][6],
        jurusan:       rows[i][7],
        mulaiMagang:   rows[i][8],
        selesaiMagang: rows[i][9],
        foto:          fotoUrl,
        status:        rows[i][11] || 'active',
        role:          rows[i][12] || 'intern',
        idLokasi:      rows[i][13] || ''
      });
    }
  }
  return { success: true, data: list };
}

// ============================================================
// INTEGRASI META WHATSAPP CLOUD API (PENGINGAT PRESENSI MASUK)
// ============================================================

/**
 * Normalisasi format nomor WhatsApp ke standar internasional tanpa tanda '+'
 * Contoh: 08123456789 -> 628123456789
 */
function formatNoHpWhatsApp(noHp) {
  if (!noHp) return '';
  var clean = String(noHp).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * Kirim pesan WhatsApp menggunakan Fonnte API
 * @param {string} toPhoneNumber - Nomor tujuan (misal: '08123456789' atau '628123456789')
 * @param {string} message - Pesan bebas yang ingin dikirimkan
 */
function kirimWhatsAppFonnte(toPhoneNumber, message) {
  var token = CONFIG.FONNTE_TOKEN;
  if (!token || token === 'ISI_FONNTE_TOKEN_DISINI') {
    Logger.log('WA Error: FONNTE_TOKEN belum diisi di CONFIG.');
    return { success: false, message: 'FONNTE_TOKEN belum dikonfigurasi di CONFIG.' };
  }

  var phone = formatNoHpWhatsApp(toPhoneNumber);
  if (!phone) {
    return { success: false, message: 'Nomor HP tidak valid: ' + toPhoneNumber };
  }

  var options = {
    method: 'post',
    headers: { 'Authorization': token },
    payload: {
      target: phone,
      message: message,
      countryCode: '62'
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch('https://api.fonnte.com/send', options);
    var resCode  = response.getResponseCode();
    var resBody  = response.getContentText();
    Logger.log('Response Fonnte WA [' + resCode + '] untuk ' + phone + ': ' + resBody);

    var jsonRes = JSON.parse(resBody);
    if (resCode === 200 && jsonRes.status === true) {
      return { success: true, message: 'Pesan WA berhasil dikirim ke ' + phone, response: jsonRes };
    } else {
      return { success: false, message: 'Gagal kirim WA Fonnte (' + resCode + '): ' + resBody };
    }
  } catch (err) {
    Logger.log('Exception kirim WA Fonnte: ' + err.message);
    return { success: false, message: 'Exception: ' + err.message };
  }
}

/**
 * Fungsi Pengingat Presensi Masuk Pagi (Bot Ence)
 * @param {boolean} isManual - jika true, abaikan cek weekend agar bisa dites atau dikirim manual kapan saja
 */
function kirimPengingatPresensiMasuk(isManual) {
  Logger.log('=== MEMULAI PENGECEKAN PENGINGAT WA PRESENSI MASUK (Bot Ence) ===');
  
  // Skip jika hari Sabtu (6) atau Minggu (0), kecuali dijalankan manual oleh user
  if (!isManual) {
    var todayDate = new Date();
    var dayOfWeek = todayDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      Logger.log('Hari ini adalah akhir pekan (Sabtu/Minggu). Pengingat WA otomatis dilewati.');
      return { success: false, message: 'Hari libur akhir pekan (Sabtu/Minggu).' };
    }
  }

  var todayStr = formatTanggal();
  var todayNorm = normalizeTanggal(todayStr);

  var regSheet = getSheet('WEB Register');
  if (!regSheet) return { success: false, message: 'Sheet WEB Register tidak ditemukan.' };
  var regRows = regSheet.getDataRange().getDisplayValues();

  var presSheet = getSheet('WEB Presensi');
  var presRows = presSheet ? presSheet.getDataRange().getValues() : [];

  var totalKirim = 0, totalLewati = 0;

  for (var i = 1; i < regRows.length; i++) {
    var statusAcc = String(regRows[i][11]).toLowerCase().trim(); // active / pending
    if (statusAcc !== 'active') continue;

    var idPeserta = regRows[i][14];
    var nama      = regRows[i][1];
    var noHp      = regRows[i][4];

    if (!noHp) {
      Logger.log('Lewati ' + nama + ': Nomor HP belum diisi.');
      continue;
    }

    var sudahAbsen = false;
    for (var j = presRows.length - 1; j >= 1; j--) {
      if (normalizeTanggal(presRows[j][0]) === todayNorm && presRows[j][1] === idPeserta) {
        sudahAbsen = true;
        break;
      }
    }

    if (sudahAbsen) {
      Logger.log('Lewati ' + nama + ': Sudah presensi masuk / izin hari ini.');
      totalLewati++;
    } else {
      Logger.log('Mengirim pengingat MASUK ke ' + nama + ' (' + noHp + ')...');
      var pesan = "🔔 *PENGINGAT PRESENSI MASUK — KAI DAOP 8*\n\n" +
                  "Halo *" + nama + "*! 👋\n\n" +
                  "Saya *Ence dari Daop 8* ingin mengingatkan bahwa saat ini sudah memasuki waktu presensi masuk magang KAI Daop 8.\n\n" +
                  "Mohon segera lakukan *Presensi Masuk* melalui tautan aplikasi presensi berikut:\n" +
                  "👉 https://presensimagangkaiDaop8.web.app\n\n" +
                  "Selamat beraktivitas dan tetap semangat ya! 🚂✨\n" +
                  "━━━━━━━━━━━━━━━━━━━━\n" +
                  "_Pesan resmi dikirim otomatis oleh Bot Ence - Unit Daop 8 Surabaya_";

      var res = kirimWhatsAppFonnte(noHp, pesan);
      if (res.success) totalKirim++;
    }
  }
  
  var msg = 'Selesai pengingat MASUK. Terkirim: ' + totalKirim + ', Dilewati: ' + totalLewati;
  Logger.log('=== ' + msg + ' ===');
  return { success: true, message: msg, totalKirim: totalKirim, totalLewati: totalLewati };
}

/**
 * Fungsi Pengingat Presensi Pulang Sore (Bot Ence)
 * @param {boolean} isManual - jika true, abaikan cek weekend agar bisa dites atau dikirim manual kapan saja
 */
function kirimPengingatPresensiPulang(isManual) {
  Logger.log('=== MEMULAI PENGECEKAN PENGINGAT WA PRESENSI PULANG (Bot Ence) ===');
  
  // Skip jika hari Sabtu (6) atau Minggu (0), kecuali dijalankan manual oleh user
  if (!isManual) {
    var todayDate = new Date();
    var dayOfWeek = todayDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      Logger.log('Hari ini adalah akhir pekan (Sabtu/Minggu). Pengingat WA otomatis dilewati.');
      return { success: false, message: 'Hari libur akhir pekan (Sabtu/Minggu).' };
    }
  }

  var todayStr = formatTanggal();
  var todayNorm = normalizeTanggal(todayStr);

  var regSheet = getSheet('WEB Register');
  if (!regSheet) return { success: false, message: 'Sheet WEB Register tidak ditemukan.' };
  var regRows = regSheet.getDataRange().getDisplayValues();

  var presSheet = getSheet('WEB Presensi');
  var presRows = presSheet ? presSheet.getDataRange().getValues() : [];

  var totalKirim = 0, totalLewati = 0;

  for (var i = 1; i < regRows.length; i++) {
    var statusAcc = String(regRows[i][11]).toLowerCase().trim();
    if (statusAcc !== 'active') continue;

    var idPeserta = regRows[i][14];
    var nama      = regRows[i][1];
    var noHp      = regRows[i][4];

    if (!noHp) continue;

    var absenHariIni = null;
    for (var j = presRows.length - 1; j >= 1; j--) {
      if (normalizeTanggal(presRows[j][0]) === todayNorm && presRows[j][1] === idPeserta) {
        absenHariIni = presRows[j];
        break;
      }
    }

    // Jika peserta HARI INI ADA DATA PRESENSI MASUK, tapi JAM PULANG (Kolom G / index 6) masih KOSONG
    if (absenHariIni) {
      var jamMasuk        = String(absenHariIni[4] || '').trim();  // Kolom E (index 4)
      var jamPulang       = String(absenHariIni[6] || '').trim();  // Kolom G (index 6)
      var statusKehadiran = String(absenHariIni[11] || '').trim(); // Kolom L (index 11)

      // Cek: Pernah absen masuk atau status Hadir, tapi belum absen pulang
      if ((statusKehadiran === 'Hadir' || jamMasuk !== '') && jamPulang === '') {
        Logger.log('Mengirim pengingat PULANG ke ' + nama + ' (' + noHp + ')...');
        var pesan = "🔔 *PENGINGAT PRESENSI PULANG — KAI DAOP 8*\n\n" +
                    "Halo *" + nama + "*! 👋\n\n" +
                    "Saya *Ence dari Daop 8* ingin mengingatkan bahwa jam operasional magang hari ini telah selesai.\n\n" +
                    "Jangan lupa untuk segera melakukan *Presensi Pulang* melalui aplikasi agar absensi dan jam kerja Anda tercatat lengkap:\n" +
                    "👉 https://presensimagangkaiDaop8.web.app\n\n" +
                    "Terima kasih atas kerja keras Anda hari ini! Hati-hati di perjalanan pulang. 🚂✨\n" +
                    "━━━━━━━━━━━━━━━━━━━━\n" +
                    "_Pesan resmi dikirim otomatis oleh Bot Ence - Unit Daop 8 Surabaya_";

        var res = kirimWhatsAppFonnte(noHp, pesan);
        if (res.success) totalKirim++;
      } else {
        totalLewati++; // Sudah pulang atau Izin/Sakit
      }
    } else {
      // Tidak presensi masuk, tidak perlu diingatkan pulang
      totalLewati++;
    }
  }
  
  var msg = 'Selesai pengingat PULANG. Terkirim: ' + totalKirim + ', Dilewati: ' + totalLewati;
  Logger.log('=== ' + msg + ' ===');
  return { success: true, message: msg, totalKirim: totalKirim, totalLewati: totalLewati };
}

/**
 * ─────────────────────────────────────────────────────────────
 * FUNGSI TRIGGER MANUAL (BISA ANDA PILIH & KLIK JALANKAN KAPAN SAJA)
 * ─────────────────────────────────────────────────────────────
 */

/**
 * 👉 PILIH FUNGSI INI DARI DROPDOWN & KLIK RUN UNTUK CHAT SEMUA ANAK MAGANG (PRESENSI MASUK)
 */
function triggerPengingatMasukManual() {
  Logger.log('>>> Memulai Eksekusi Manual: PENGINGAT MASUK (Bot Ence) <<<');
  var hasil = kirimPengingatPresensiMasuk(true); // true = abaikan weekend / kirim sekarang juga
  Logger.log('>>> HASIL AKHIR: ' + JSON.stringify(hasil));
}

/**
 * 👉 PILIH FUNGSI INI DARI DROPDOWN & KLIK RUN UNTUK CHAT SEMUA ANAK MAGANG (PRESENSI PULANG)
 */
function triggerPengingatPulangManual() {
  Logger.log('>>> Memulai Eksekusi Manual: PENGINGAT PULANG (Bot Ence) <<<');
  var hasil = kirimPengingatPresensiPulang(true); // true = abaikan weekend / kirim sekarang juga
  Logger.log('>>> HASIL AKHIR: ' + JSON.stringify(hasil));
}

/**
 * PENTING: Pasang Trigger Otomatis Harian di Google Apps Script
 * Buka Apps Script -> Pilih fungsi ini (setupTriggerPengingatWA) di dropdown atas -> Klik "Run/Jalankan"
 * Fungsi ini akan menjadwalkan Pengingat Masuk (07:45) & Pengingat Pulang (16:00) otomatis setiap hari.
 */
function setupTriggerPengingatWA() {
  // Hapus semua trigger lama (agar tidak double/spam)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var handler = triggers[i].getHandlerFunction();
    if (handler === 'kirimPengingatPresensiMasuk' || handler === 'kirimPengingatPresensiPulang' || handler === 'kirimPengingatPresensiPagi') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Pasang trigger Masuk (Pagi 07:45 WIB)
  ScriptApp.newTrigger('kirimPengingatPresensiMasuk')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(45)
    .create();

  // Pasang trigger Pulang (Sore 16:00 WIB)
  ScriptApp.newTrigger('kirimPengingatPresensiPulang')
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .nearMinute(0)
    .create();

  Logger.log('✅ Trigger Pengingat WA Berhasil Dipasang: [Masuk: 07:45] & [Pulang: 16:00]');
}

/**
 * Fungsi Uji Coba Pengiriman WA Langsung dari Editor Apps Script
 * Ganti variabel noHpTest dengan nomor WA Anda, lalu klik tombol 'Run/Jalankan' pada fungsi ini.
 */
function testKirimWhatsAppFonnte() {
  var noHpTest = '082273952703'; // Nomor pengujian Anda
  var pesan = "Halo! Saya *Ence dari Daop 8* 🚂✨\nIni adalah pesan uji coba Bot Pengingat Presensi KAI Daop 8 via Fonnte. Sistem siap digunakan!";
  
  Logger.log('Memulai uji coba pengiriman WA Fonnte ke ' + noHpTest);
  var res = kirimWhatsAppFonnte(noHpTest, pesan);
  Logger.log('Hasil Uji Coba: ' + JSON.stringify(res));
}

// ============================================================
// HANDLER: getPenugasanPublic
// Endpoint publik — siapa pun bisa ambil daftar unit kerja & lokasi
// Tidak butuh token karena data ini hanya read-only & tidak sensitif.
// ============================================================
function handleGetPenugasanPublic(data) {
  var sheet = getOrCreatePenugasanSheet();
  var rows = sheet.getDataRange().getValues();
  var unitList = [], lokasiList = [];

  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][1] === 'unit_kerja') {
      unitList.push({ id: rows[i][0], nama: rows[i][3] });
    } else if (rows[i][1] === 'lokasi') {
      lokasiList.push({
        id:      rows[i][0],
        idInduk: rows[i][2],
        nama:    rows[i][3],
        alamat:  rows[i][4] || '',
        lat:     parseFloat(rows[i][5]) || null,
        lng:     parseFloat(rows[i][6]) || null,
        radius:  parseInt(rows[i][7]) || 100
      });
    }
  }

  return { success: true, data: { unitList: unitList, lokasiList: lokasiList } };
}

// ============================================================
// HANDLER: selfAssignLokasi
// Peserta magang memilih/pindah ke lokasi penugasan sendiri.
// Validasi: sesi valid + idLokasi harus ada di WEB Penugasan.
// ============================================================
function handleSelfAssignLokasi(data) {
  var idPeserta = validateSession(data.token);
  if (!idPeserta) return { success: false, message: 'Sesi tidak valid.' };
  if (!data.idLokasi) return { success: false, message: 'Pilih lokasi terlebih dahulu.' };

  // Validasi: idLokasi harus terdaftar di WEB Penugasan sebagai tipe 'lokasi'
  var penSheet = getOrCreatePenugasanSheet();
  var penRows = penSheet.getDataRange().getValues();
  var lokasiValid = false;
  var lokasiNama = '';
  var lokasiLat = null, lokasiLng = null, lokasiRadius = 100;
  var idInduk = '';

  for (var j = 1; j < penRows.length; j++) {
    if (String(penRows[j][0]) === String(data.idLokasi) && penRows[j][1] === 'lokasi') {
      lokasiValid = true;
      lokasiNama   = penRows[j][3];
      idInduk      = penRows[j][2];
      lokasiLat    = parseFloat(penRows[j][5]) || null;
      lokasiLng    = parseFloat(penRows[j][6]) || null;
      lokasiRadius = parseInt(penRows[j][7]) || 100;
      break;
    }
  }

  if (!lokasiValid) return { success: false, message: 'Lokasi tidak ditemukan di sistem.' };

  // Ambil nama unit kerja induk
  var unitKerjaNama = '—';
  if (idInduk) {
    for (var k = 1; k < penRows.length; k++) {
      if (penRows[k][0] === idInduk && penRows[k][1] === 'unit_kerja') {
        unitKerjaNama = penRows[k][3];
        break;
      }
    }
  }

  // Update idLokasi di WEB Register (kolom N / index 13)
  var regSheet = getSheet('WEB Register');
  if (!regSheet) return { success: false, message: 'Sheet registrasi tidak ditemukan.' };
  var regRows = regSheet.getDataRange().getDisplayValues();
  for (var i = 1; i < regRows.length; i++) {
    if (regRows[i][14] === idPeserta) {
      regSheet.getRange(i + 1, 14).setValue(data.idLokasi);
      return {
        success: true,
        message: 'Lokasi penugasan berhasil diperbarui.',
        data: {
          idLokasi:  data.idLokasi,
          lokasi:    lokasiNama,
          unitKerja: unitKerjaNama,
          lat:       lokasiLat,
          long:      lokasiLng,
          radius:    lokasiRadius
        }
      };
    }
  }

  return { success: false, message: 'Data peserta tidak ditemukan.' };
}

