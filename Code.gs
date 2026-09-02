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
  SESSION_EXPIRE:  8 * 60 * 60 * 1000
};

// ─── ENTRY POINT (WEB APP API) ───────────────────────────────
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

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
      case 'getLokasi':         result = handleGetLokasi(data);         break;
      case 'addLokasi':         result = handleAddLokasi(data);         break;
      default: result = { success: false, message: 'Action tidak dikenal' };
    }
    return respond(result);
  } catch (err) {
    return respond({ success: false, message: 'Server error: ' + err.message });
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
  var oldRes = ss.getSheetByName('Form Responses 1');
  // Hanya migrasi jika WEB Presensi masih kosong (cuma header)
  if (oldRes && pSheet.getLastRow() <= 1) {
    var respRows = oldRes.getDataRange().getDisplayValues(); // Gunakan getDisplayValues agar aman dari objek Date
    var allRegRows = webReg.getDataRange().getDisplayValues();
    var mapPeserta = {};
    for (var k = 1; k < allRegRows.length; k++) {
      mapPeserta[String(allRegRows[k][1]).toLowerCase().trim()] = { id: allRegRows[k][14], nama: allRegRows[k][1] };
    }
    
    // Simpan data di memory dulu agar cepat
    var presensiMap = {}; // format: "ID_TANGGAL" -> rowData
    
    for (var r = 1; r < respRows.length; r++) {
      var rNama = String(respRows[r][1]).toLowerCase().trim();
      var pData = mapPeserta[rNama];
      if (pData) {
        var tgl = respRows[r][5];
        var konf = String(respRows[r][6]).toLowerCase().trim();
        var jam = formatJam(respRows[r][0]); // Jam Submit
        var lokasi = respRows[r][4];
        // Kolom H (index 7) = DOKUMENTASI = URL foto Google Drive
        var fotoUrl = respRows[r][7] || '';
        
        if (tgl) {
          var key = pData.id + "_" + tgl;
          if (!presensiMap[key]) {
            // [Tgl, ID, Nama, Lokasi, Masuk, FotoM, Pulang, FotoP, Total, GPSM, GPSP, Status]
            presensiMap[key] = [tgl, pData.id, pData.nama, lokasi, '', '', '', '', '', '', '', 'Hadir'];
          }
          if (konf === 'datang' && !presensiMap[key][4]) {
            presensiMap[key][4] = jam;
            if (fotoUrl) presensiMap[key][5] = fotoUrl; // simpan foto masuk
          } else if (konf === 'pulang' && !presensiMap[key][6]) {
            presensiMap[key][6] = jam;
            if (fotoUrl) presensiMap[key][7] = fotoUrl; // simpan foto pulang
            presensiMap[key][8] = hitungTotalJam(presensiMap[key][4] || jam, jam);
          }
        }
      }
    }
    
    // Tulis ke sheet sekaligus
    var writeData = [];
    for (var key in presensiMap) { writeData.push(presensiMap[key]); }
    if (writeData.length > 0) {
      pSheet.getRange(2, 1, writeData.length, writeData[0].length).setValues(writeData);
    }
    Logger.log("Migrasi riwayat presensi selesai.");
  }
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
  
  var pRows = pSheet.getDataRange().getDisplayValues();
  var foundRow = -1;
  for (var x = 1; x < pRows.length; x++) {
    if (pRows[x][0] === tanggal && pRows[x][1] === pId) { foundRow = x + 1; break; }
  }
  
  if (foundRow > -1) {
    if (konfirmasi === 'datang' && !pRows[foundRow-1][4]) {
       pSheet.getRange(foundRow, 5).setValue(jamSubmit);
       pSheet.getRange(foundRow, 4).setValue(lokasi);
       if (fotoUrl) pSheet.getRange(foundRow, 6).setValue(fotoUrl); // Foto Masuk
    } else if (konfirmasi === 'pulang' && !pRows[foundRow-1][6]) {
       pSheet.getRange(foundRow, 7).setValue(jamSubmit);
       if (fotoUrl) pSheet.getRange(foundRow, 8).setValue(fotoUrl); // Foto Pulang
       var jamM = pRows[foundRow-1][4] || jamSubmit;
       pSheet.getRange(foundRow, 9).setValue(hitungTotalJam(String(jamM), String(jamSubmit)));
    }
  } else {
    if (konfirmasi === 'datang') {
      pSheet.appendRow([tanggal, pId, pNamaAsli, lokasi, jamSubmit, fotoUrl, '', '', '', '', '', 'Hadir']);
    } else if (konfirmasi === 'pulang') {
      pSheet.appendRow([tanggal, pId, pNamaAsli, lokasi, '', '', jamSubmit, '', '', '', '', 'Hadir']);
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

function handleGetPesertaList() {
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] && rows[i][11] === 'active') {
      list.push({ id: rows[i][14], nama: rows[i][1] });
    }
  }
  return { success: true, data: list };
}

function handleLogin(data) {
  var nama = data.nama, tglLahir = data.tanggalLahir;
  if (!nama || !tglLahir) return { success: false, message: 'Nama dan tanggal lahir harus diisi' };

  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Database WEB Register tidak ditemukan.' };

  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === nama.trim().toLowerCase()) {
      var rowTgl = rows[i][2].trim();
      if (rowTgl === '') return { success: false, message: 'Tanggal lahir belum diatur oleh admin. Minta admin untuk mengaturnya di WEB Register.'};
      
      if (rowTgl === tglLahir.trim()) {
        if (rows[i][11] === 'pending')  return { success: false, message: 'Akun Anda menunggu persetujuan admin.' };
        if (rows[i][11] === 'rejected') return { success: false, message: 'Akun Anda ditolak.' };
        if (rows[i][11] !== 'active')   return { success: false, message: 'Status akun tidak valid.' };
  
        var lat = null, lng = null, lokasiNama = rows[i][13];
        if (rows[i][13]) {
          var lokSheet = getSheet('WEB Lokasi');
          if (lokSheet) {
            var lokRows = lokSheet.getDataRange().getDisplayValues();
            for (var j = 1; j < lokRows.length; j++) {
              if (lokRows[j][0] === rows[i][13]) {
                lokasiNama = lokRows[j][1]; lat = lokRows[j][3]; lng = lokRows[j][4]; break;
              }
            }
          }
        }
  
        // Konversi URL foto ke format thumbnail yang bisa diembed di browser
        var fotoLogin = rows[i][10] || '';
        if (fotoLogin) {
          var idFotoLogin = extractDriveId(fotoLogin);
          if (idFotoLogin) fotoLogin = 'https://drive.google.com/thumbnail?id=' + idFotoLogin + '&sz=w400';
        }

        var token = createSession(rows[i][14]);
        return {
          success: true, token: token,
          user: { 
            id: rows[i][14], 
            nama: rows[i][1], 
            role: rows[i][12] || 'intern', 
            lokasi: lokasiNama || 'Belum ditetapkan', 
            lat: lat, 
            long: lng,
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
  sheet.appendRow([new Date().toISOString(), data.nama.trim(), data.tanggalLahir.trim(), data.alamat, data.noHp, data.email, data.kampus, data.jurusan, data.mulaiMagang || '', data.selesaiMagang || '', fotoUrl, 'pending', 'intern', '', generatePesertaId()]);
  return { success: true, message: 'Pendaftaran berhasil! Tunggu persetujuan admin.' };
}

function handleGetProfile(data) {
  var idPeserta = validateSession(data.token);
  if (!idPeserta) return { success: false, message: 'Sesi tidak valid.' };
  
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][14] === idPeserta) {
      // Konversi URL foto ke format thumbnail yang bisa diembed
      var fotoUrl = rows[i][10] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://drive.google.com/thumbnail?id=' + idFoto + '&sz=w400';
      }
      
      var lat = null, lng = null, lokasiNama = rows[i][13];
      if (rows[i][13]) {
        var lokSheet = getSheet('WEB Lokasi');
        if (lokSheet) {
          var lokRows = lokSheet.getDataRange().getDisplayValues();
          for (var j = 1; j < lokRows.length; j++) {
            if (lokRows[j][0] === rows[i][13]) {
              lokasiNama = lokRows[j][1]; lat = lokRows[j][3]; lng = lokRows[j][4]; break;
            }
          }
        }
      }
      
      return {
        success: true,
        data: {
          id: rows[i][14],
          nama: rows[i][1],
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
          lat: lat,
          long: lng
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

  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === today && rows[i][1] === data.idPeserta) {
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
  if (idLokasi) {
    var lokSheet = getSheet('WEB Lokasi');
    if (lokSheet) {
      var lokRows = lokSheet.getDataRange().getDisplayValues();
      for (var j = 1; j < lokRows.length; j++) {
        if (lokRows[j][0] === idLokasi) {
          var jarak  = hitungJarak(data.latitude, data.longitude, lokRows[j][3], lokRows[j][4]);
          var radius = lokRows[j][5] || CONFIG.GEOFENCE_RADIUS;
          if (jarak > radius) return { success: false, message: 'Di luar area (' + Math.round(jarak) + 'm).' };
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
  
  var dsRows = dataSheet.getDataRange().getDisplayValues();
  for (var k = dsRows.length - 1; k >= 1; k--) {
    if (dsRows[k][0] === today && dsRows[k][1] === data.idPeserta && dsRows[k][4]) return { success: false, message: 'Sudah presensi masuk.' };
  }

  var jamMasuk = formatJam(data.timestamp ? new Date(data.timestamp) : new Date());
  var fotoUrl = data.foto64 ? uploadFoto(data.foto64, 'masuk_' + data.idPeserta + '_' + today.replace(/\//g,'-') + '.jpg') : '';
  
  var namaLokasi = idLokasi || 'KANTOR DAOP';
  var lS = getSheet('WEB Lokasi');
  if (lS && idLokasi) {
    var lR = lS.getDataRange().getDisplayValues();
    for (var m = 1; m < lR.length; m++) if (lR[m][0] === idLokasi) { namaLokasi = lR[m][1]; break; }
  }

  dataSheet.appendRow([today, data.idPeserta, peserta[1], namaLokasi, jamMasuk, fotoUrl, '', '', '', data.latitude+','+data.longitude, '', 'Hadir']);
  return { success: true, jamMasuk: jamMasuk };
}

function handleCheckOut(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  var today = formatTanggal();
  var dataSheet = getSheet('WEB Presensi');
  if (!dataSheet) return { success: false, message: 'Belum presensi masuk.' };

  var rows = dataSheet.getDataRange().getDisplayValues();
  var targetRow = -1;
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === today && rows[i][1] === data.idPeserta && rows[i][4] && !rows[i][6]) { targetRow = i + 1; break; }
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
      result.push({ no: no++, tanggal: rows[i][0], lokasi: rows[i][3], jamMasuk: rows[i][4], fotoMasuk: rows[i][5], jamPulang: rows[i][6], fotoPulang: rows[i][7], totalJam: rows[i][8], gpsMasuk: rows[i][9], gpsPulang: rows[i][10], status: rows[i][11] });
    }
  }
  return { success: true, data: result.reverse() };
}

// ─── ADMIN ENDPOINTS (Dipendekkan) ───────────────────────────
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
    var folder; try { folder = DriveApp.getFolderById(CONFIG.FOLDER_FOTO_ID); } catch(e) { folder = DriveApp.getRootFolder(); }
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
    var pm = String(jamMasuk).split(':').map(Number);
    var pp = String(jamPulang).split(':').map(Number);
    if (pm.length < 2 || pp.length < 2) return '';
    
    var selisih = (pp[0]*60 + pp[1]) - (pm[0]*60 + pm[1]);
    if (selisih <= 0) return '0j 0m';
    return Math.floor(selisih / 60) + 'j ' + (selisih % 60) + 'm';
  } catch(e) {
    return ''; // Jika format gagal, kembalikan kosong agar tidak error merah
  }
}
