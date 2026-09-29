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
    sheet.appendRow(['Timestamp Submit','Nama Lengkap','Tanggal Lahir','Alamat','No HP', 'NIM', 'Email',
      'Kampus','Jurusan','Tanggal Mulai','Tanggal Selesai','Foto Profil URL',
      'Status Akun','Role','ID Lokasi','ID Unik']);
  }
  
  // Dropdown untuk kolom M (Role)
  var roleRule = SpreadsheetApp.newDataValidation().requireValueInList(['admin', 'intern'], true).build();
  sheet.getRange('N2:N').setDataValidation(roleRule);
  
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
      sheet.getRange(i + 1, 14).setValue('admin');
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
        if (idxEmail > -1)   webReg.getRange(i + 1, 12).setValue(oldData[j][idxEmail]);  // Email
        if (idxKampus > -1)  webReg.getRange(i + 1, 12).setValue(oldData[j][idxKampus]); // Kampus
        if (idxJurusan > -1) webReg.getRange(i + 1, 12).setValue(oldData[j][idxJurusan]); // Jurusan
        if (idxMulai > -1)   webReg.getRange(i + 1, 12).setValue(oldData[j][idxMulai]);  // Tgl Mulai
        if (idxSelesai > -1) webReg.getRange(i + 1, 12).setValue(oldData[j][idxSelesai]);// Tgl Selesai
        
        // Ekstrak URL foto Drive jika ada
        if (idxFoto > -1 && oldData[j][idxFoto]) {
          var idFoto = extractDriveId(oldData[j][idxFoto]);
          if (idFoto) {
            webReg.getRange(i + 1, 12).setValue("https://drive.google.com/uc?id=" + idFoto); // Foto URL khusus render
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
      webReg.appendRow([rows[i][0] || new Date().toISOString(), nama, '', rows[i][2] || '', '', '', '', '', '', '', '', '', 'active', 'intern', '', newId]);
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
