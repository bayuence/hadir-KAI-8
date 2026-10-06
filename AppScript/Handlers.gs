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

  var rows = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] && rows[i][8] === 'active') {
      // Konversi URL foto ke format lh3 CDN Google untuk daftar peserta
      var fotoUrl = rows[i][7] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s200';
      }
      list.push({
        id:       rows[i][11],
                nama:     rows[i][1],
        idLokasi: rows[i][10] || '',
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
  var nama = data.nama, nim = data.nim;
  if (!nama || !nim) return { success: false, message: 'Nama dan NIM harus diisi' };

  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Database WEB Register tidak ditemukan.' };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase().trim() === String(nama).toLowerCase().trim()) {
      var rowNim = String(rows[i][2] || '').trim();
        if (rowNim === '') return { success: false, message: 'NIM belum diatur oleh admin. Minta admin untuk mengaturnya di WEB Register.'};
        if (rowNim.toLowerCase() === String(nim).toLowerCase().trim()) {
        if (rows[i][8] === 'pending')  return { success: false, message: 'Akun Anda menunggu persetujuan admin.' };
        if (rows[i][8] === 'rejected') return { success: false, message: 'Akun Anda ditolak.' };
        if (rows[i][8] !== 'active')   return { success: false, message: 'Status akun tidak valid.' };
  
        var lat = null, lng = null, radius = 100, lokasiNama = rows[i][10], unitKerjaNama = 'â€”';
        if (rows[i][10]) {
          var penSheet2 = getSheet('WEB Penugasan');
          if (penSheet2) {
            var penRows2 = penSheet2.getDataRange().getValues();
            var idInduk2 = '';
            for (var j = 1; j < penRows2.length; j++) {
              if (penRows2[j][0] === rows[i][10] && penRows2[j][1] === 'lokasi') {
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
        var fotoLogin = rows[i][7] || '';
        if (fotoLogin) {
          var idFotoLogin = extractDriveId(fotoLogin);
          if (idFotoLogin) fotoLogin = 'https://lh3.googleusercontent.com/d/' + idFotoLogin + '=s400';
        }

        var token = createSession(rows[i][11]);
        // Header WEB Register:
        // [0]=Timestamp, [1]=Nama, [2]=NIM, [3]=Kampus, [4]=Jurusan,
        // [5]=Tgl Mulai, [6]=Tgl Selesai, [7]=Foto, [8]=Status Akun,
        // [9]=Role, [10]=ID Lokasi, [11]=ID Unik
        return {
          success: true, token: token,
          user: { 
            id: rows[i][11],
            nim: rows[i][2] || '',
            nama: rows[i][1], 
            kampus: rows[i][3],
            jurusan: rows[i][4],
            mulaiMagang: normalizeTanggal(rows[i][5]),
            selesaiMagang: normalizeTanggal(rows[i][6]),
            role: rows[i][9] || 'intern', 
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
  sheet.appendRow([new Date().toISOString(), data.nama.trim(), data.tanggalLahir.trim(), data.alamat, data.noHp, data.nim || '', data.email, data.kampus, data.jurusan, data.mulaiMagang || '', data.selesaiMagang || '', fotoUrl, 'active', 'intern', '', generatePesertaId()]);
  return { success: true, message: 'Pendaftaran berhasil! Silakan login.' };
}

function handleGetProfile(data) {
  var idPeserta = validateSession(data.token);
  if (!idPeserta) return { success: false, message: 'Sesi tidak valid.' };
  
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][11] === idPeserta) {
      // Konversi URL foto ke format lh3 CDN Google
      // lh3.googleusercontent.com tidak butuh cookie/session, aman di semua browser & Safari
      var fotoUrl = rows[i][7] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s400';
      }
      
      var lat = null, lng = null, radius = 100, lokasiNama = rows[i][10], unitKerjaNama = 'â€”';
      if (rows[i][10]) {
        var penSheet = getSheet('WEB Penugasan');
        if (penSheet) {
          var penRows = penSheet.getDataRange().getValues(); // Gunakan getValues() agar desimal koordinat tidak terpotong (rounded)
          var idInduk = '';
          for (var j = 1; j < penRows.length; j++) {
            if (penRows[j][0] === rows[i][10] && penRows[j][1] === 'lokasi') {
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
      
      // Header WEB Register:
      // [0]=Timestamp, [1]=Nama, [2]=NIM, [3]=Kampus, [4]=Jurusan,
      // [5]=Tgl Mulai, [6]=Tgl Selesai, [7]=Foto, [8]=Status Akun,
      // [9]=Role, [10]=ID Lokasi, [11]=ID Unik
      return {
        success: true,
        data: {
          id: rows[i][11],
          nim: rows[i][2] || '',
          nama: rows[i][1],
          kampus: rows[i][3],
          jurusan: rows[i][4],
          mulaiMagang: normalizeTanggal(rows[i][5]),
          selesaiMagang: normalizeTanggal(rows[i][6]),
          foto: fotoUrl,
          role: rows[i][9] || 'intern',
          lokasi: lokasiNama || 'Belum ditetapkan',
          unitKerja: unitKerjaNama,
          idLokasi: rows[i][10] || '',
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
  var cacheKey = 'status_' + data.idPeserta + '_' + normalizeTanggal(today);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  // if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} } // CACHE DIMATIKAN SEMENTARA AGAR DATA BARU MUNCUL
  
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null } };
  var rows = sheet.getDataRange().getDisplayValues();
  var statusData = { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null };
  for (var i = rows.length - 1; i >= 1; i--) {
    if (normalizeTanggal(rows[i][0]) === normalizeTanggal(today) && String(rows[i][1]) === String(data.idPeserta)) {
      statusData = { sudahMasuk: !!rows[i][4], sudahPulang: !!rows[i][6], jamMasuk: rows[i][4] || null, jamPulang: rows[i][6] || null };
      break;
    }
  }
  try { cache.put(cacheKey, JSON.stringify(statusData), 21600); } catch(e){}
  return { success: true, data: statusData };
}

function handleCheckIn(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  
  var regRows  = getSheet('WEB Register').getDataRange().getDisplayValues();
  var peserta  = null;
  for (var i = 1; i < regRows.length; i++) if (String(regRows[i][11]) === String(data.idPeserta)) { peserta = regRows[i]; break; }
  
  if (!peserta) return { success: false, message: 'Data peserta tidak ditemukan di database WEB Register.' };
  var idLokasi = peserta[10];
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
  
  var dsRows = dataSheet.getDataRange().getDisplayValues();
  var todayNorm = normalizeTanggal(today);
  for (var k = dsRows.length - 1; k >= 1; k--) {
    // Normalize tanggal di sheet agar cocok dengan format apapun
    if (normalizeTanggal(dsRows[k][0]) === todayNorm && String(dsRows[k][1]) === String(data.idPeserta) && dsRows[k][4]) return { success: false, message: 'Sudah presensi masuk.' };
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

  var rows = dataSheet.getDataRange().getDisplayValues();
  var targetRow = -1;
  var todayNormCO = normalizeTanggal(today);
  for (var i = rows.length - 1; i >= 1; i--) {
    // Normalize tanggal di kedua sisi agar berbagai format bisa cocok (DD/MM/YYYY vs M/D/YYYY)
    if (normalizeTanggal(rows[i][0]) === todayNormCO && String(rows[i][1]) === String(data.idPeserta) && rows[i][4] && !rows[i][6]) { targetRow = i + 1; break; }
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
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var cacheKey = 'riwayat_' + data.idPeserta;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  // if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} } // CACHE DIMATIKAN SEMENTARA AGAR DATA BARU MUNCUL
  
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getDisplayValues();
  var result = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(data.idPeserta)) {
      var dStr = String(rows[i][0] || '');
      // Header WEB Presensi:
      // [0]=TANGGAL, [1]=ID PESERTA, [2]=NAMA, [3]=LOKASI,
      // [4]=JAM MASUK, [5]=FOTO MASUK, [6]=JAM PULANG, [7]=FOTO PULANG,
      // [8]=TOTAL JAM, [9]=GPS MASUK, [10]=GPS PULANG, [11]=STATUS
      var statusSheet = String(rows[i][11] || '').trim();
      // Gunakan status dari kolom STATUS (index 11),
      // fallback ke 'Hadir' / 'Belum Pulang' berdasarkan jam pulang
      var statusFinal = statusSheet ||
                        (rows[i][6] ? 'Hadir' : (rows[i][4] ? 'Belum Pulang' : 'Alfa'));
      result.push({
        tanggal:    normalizeTanggal(dStr),
        jamMasuk:   rows[i][4] || null,
        jamPulang:  rows[i][6] || null,
        fotoMasuk:  rows[i][5] || null,
        fotoPulang: rows[i][7] || null,
        lokasi:     rows[i][3] || null,
        totalJam:   rows[i][8] || null,
        status:     statusFinal
      });
      if (result.length >= 31) break;
    }
  }
  try { cache.put(cacheKey, JSON.stringify(result), 21600); } catch(e){}
  return { success: true, data: result };
}

// â”€â”€â”€ HANDLER IZIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (String(regRows[i][11]) === String(data.idPeserta)) {
      pesertaNama = regRows[i][1];
      if (regRows[i][10]) pesertaLokasi = regRows[i][10];
      break;
    }
  }

  var dataSheet = getOrCreateSheet('WEB Presensi');
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(['TANGGAL', 'ID PESERTA', 'NAMA', 'LOKASI', 'JAM MASUK', 'FOTO MASUK', 'JAM PULANG', 'FOTO PULANG', 'TOTAL JAM', 'GPS MASUK', 'GPS PULANG', 'STATUS']);
  }

  var dsRows = dataSheet.getDataRange().getDisplayValues();
  for (var k = dsRows.length - 1; k >= 1; k--) {
    if (normalizeTanggal(dsRows[k][0]) === tglInputNorm && String(dsRows[k][1]) === String(data.idPeserta)) {
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
      if (String(pRows[j][1]) === String(data.idPeserta) && pRows[j][11] && pRows[j][11].toLowerCase().startsWith('ijin')) {
        var tglNorm = normalizeTanggal(pRows[j][0]);
        var displayJenis = 'Lainnya';
        var stLower = pRows[j][11].toLowerCase();
        if (stLower.indexOf('sakit') !== -1) displayJenis = 'Sakit';
        else if (stLower.indexOf('kampus') !== -1 || stLower.indexOf('kuliah') !== -1) displayJenis = 'Kuliah';

        var key = tglNorm + '_' + data.idPeserta;
        seenKeys[key] = true;

        // WEB Presensi: [3]=LOKASI, [4]=JAM MASUK, [5]=FOTO MASUK
        result.push({
          id: 'P-' + j,
          tanggal: tglNorm,
          jenis: displayJenis,
          keterangan: pRows[j][3] || '',  // LOKASI sebagai keterangan
          fotoUrl: pRows[j][5] || '',     // FOTO MASUK (foto bukti izin)
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
      if (String(rows[i][1]) === String(data.idPeserta)) {
        var tglNormIzin = normalizeTanggal(rows[i][3]);
        var keyIzin = tglNormIzin + '_' + data.idPeserta;
        if (!seenKeys[keyIzin]) {
          seenKeys[keyIzin] = true;
          // Header WEB Izin:
          // [0]=ID IZIN, [1]=ID PESERTA, [2]=NAMA, [3]=TANGGAL,
          // [4]=JENIS, [5]=KETERANGAN, [6]=FOTO BUKTI, [7]=STATUS, [8]=TIMESTAMP
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

// â”€â”€â”€ ADMIN ENDPOINTS (Dipendekkan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Util: konversi tanggal (DD/MM/YYYY) ke angka yg bisa dibandingkan â”€â”€
function tglToKey(str) {
  if (!str) return null;
  var norm = normalizeTanggal(str); // -> 'DD/MM/YYYY'
  var m = String(norm).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (!d || !mo || !y) return null;
  return y * 10000 + mo * 100 + d;
}

// Tentukan posisi tanggal target thd masa magang: 'Belum' | 'Selesai' | 'Aktif'
function statusMasaMagang(mulaiStr, selesaiStr, tglNorm) {
  var target  = tglToKey(tglNorm);
  var mulai   = tglToKey(mulaiStr);
  var selesai = tglToKey(selesaiStr);
  if (target == null) return 'Aktif';
  if (mulai   && target < mulai)   return 'Belum';   // tanggal sblm mulai magang
  if (selesai && target > selesai) return 'Selesai'; // tanggal stlh selesai magang
  return 'Aktif';
}

function handleGetAllPresensi(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  if (!data.tanggal) return { success: false, message: 'Parameter tanggal diperlukan.' };

  var tglNorm   = normalizeTanggal(data.tanggal);
  var regSheet  = getSheet('WEB Register');
  var pSheet    = getSheet('WEB Presensi');
  var penSheet  = getSheet('WEB Penugasan');

  if (!regSheet) return { success: true, data: [] };

  // â”€â”€ 1. Bangun map lokasi: idLokasi â†’ namaLengkap (dari WEB Penugasan) â”€â”€â”€
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

  // â”€â”€ 2. Bangun map presensi hari ini: idPeserta â†’ row data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ 3. Iterasi SEMUA peserta aktif dari WEB Register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var regRows = regSheet.getDataRange().getDisplayValues();
  var result  = [];

  for (var r = 1; r < regRows.length; r++) {
    var statusAkun = String(regRows[r][8]).trim().toLowerCase();
    if (statusAkun !== 'active') continue; // Skip pending/rejected

    var idPeserta   = String(regRows[r][11]).trim();
    if (!idPeserta) continue; // Abaikan baris kosong tanpa ID
    var namaPeserta = String(regRows[r][1]).trim();
    var noHp        = String(regRows[r][4] || '').trim().replace(/^0/, '62'); // format internasional
    var fotoProfil  = String(regRows[r][7] || '').trim();
    // col[13] di WEB Register = ID Lokasi yang ditetapkan admin
    var idLokasiPeserta = String(regRows[r][10] || '').trim();
    var penempatan      = idLokasiPeserta ? (namaLokasiMap[idLokasiPeserta] || idLokasiPeserta) : '';

    var pData = presensiMap[idPeserta];
    // Masa magang peserta (Aktif / Selesai / Belum) â†’ untuk menandai kartu nonaktif
    var masa = statusMasaMagang(String(regRows[r][5] || ''), String(regRows[r][6] || ''), tglNorm);

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
        status:     pData.status,
        masaMagang: masa
      });
    } else {
      // Tidak ada data presensi â†’ status memakai hasil cek masa magang
      var stNonPresensi = (masa === 'Selesai') ? 'Selesai'
                        : (masa === 'Belum')    ? 'Belum'
                        : 'Alfa';
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
        status:     stNonPresensi,
        masaMagang: masa
      });
    }
  }

  // â”€â”€ 4. Sort: BlmPulang â†’ Hadir â†’ Ijin â†’ Alfa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var order = function(p) {
    if (p.masaMagang && p.masaMagang !== 'Aktif') return 4; // nonaktif magang paling bawah
    if (p.status === 'Hadir' && p.jamMasuk && !p.jamPulang) return 0; // Blm Pulang duluan
    if (p.status === 'Hadir') return 1;
    if (p.status && p.status.indexOf('Ijin') === 0) return 2;
    if (p.status === 'Alfa') return 3;
    if (p.status === 'Selesai' || p.status === 'Belum') return 4;
    return 5;
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
      if (!String(rows[i][11] || '').trim()) continue; // Abaikan jika tidak punya ID
      if (rows[i][8] === 'pending') { pending++; continue; }
      if (rows[i][8] !== 'active') continue;
      // Lewati peserta di luar masa magang (sudah selesai / belum mulai) dari statistik kehadiran
      if (statusMasaMagang(String(rows[i][5] || ''), String(rows[i][6] || ''), today) !== 'Aktif') continue;
      total++;
      var isHadir = false, isIzin = false;
      if (pSheet) {
        var pRows = pSheet.getDataRange().getDisplayValues();
        for (var j = pRows.length - 1; j >= 1; j--) {
          if (pRows[j][0] === today && pRows[j][1] === rows[i][11]) {
            var stPres = String(pRows[j][11] || 'Hadir').trim();
            if (stPres.indexOf('Ijin') === 0 || stPres === 'Izin') isIzin = true; else isHadir = true;
            break;
          }
        }
      }
      if (isIzin) izin++; else if (isHadir) hadir++; else tidakHadir++;
    }
  }
  return { success: true, data: { hadir: hadir, izin: izin, tidakHadir: tidakHadir, pending: pending, total: total } };
}

// â”€â”€ Rekap per peserta selama bulan berjalan (untuk tabel Dashboard Admin) â”€â”€
function handleGetRekapBulanan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };

  var today    = formatTanggal();                 // DD/MM/YYYY
  var regSheet = getSheet('WEB Register');
  var pSheet   = getSheet('WEB Presensi');
  if (!regSheet) return { success: true, data: [] };

  var tParts = today.split('/');
  var bln    = Number(tParts[1]);
  var thn    = Number(tParts[2]);

  // Kumpulkan presensi bulan berjalan: id -> { hadir, izin, alfa }
  var byId = {}, seenDates = {};
  if (pSheet) {
    var pRows = pSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < pRows.length; i++) {
      var tgl = normalizeTanggal(pRows[i][0]);
      var tp  = tgl.split('/');
      if (Number(tp[1]) !== bln || Number(tp[2]) !== thn) continue;
      var pid = String(pRows[i][1]).trim();
      if (!pid) continue;
      if (!seenDates[pid]) seenDates[pid] = {};
      if (seenDates[pid][tgl]) continue;          // cukup 1 catatan per tanggal
      seenDates[pid][tgl] = true;
      var st  = String(pRows[i][11] || 'Hadir').trim();
      var rec = byId[pid] || { hadir: 0, izin: 0, alfa: 0 };
      if (st.indexOf('Ijin') === 0 || st.indexOf('Izin') === 0) rec.izin++;
      else if (st === 'Alfa') rec.alfa++;
      else rec.hadir++;
      byId[pid] = rec;
    }
  }

  var regRows = regSheet.getDataRange().getDisplayValues();
  var result  = [];
  for (var r = 1; r < regRows.length; r++) {
    if (String(regRows[r][8]).trim() !== 'active') continue;
    var mm = statusMasaMagang(String(regRows[r][5] || ''), String(regRows[r][6] || ''), today);
    if (mm !== 'Aktif') continue;                 // hanya peserta dalam masa magang
    var id  = String(regRows[r][11]).trim();
    if (!id) continue;                            // Abaikan baris kosong tanpa ID
    var c   = byId[id] || { hadir: 0, izin: 0, alfa: 0 };
    result.push({
      id: id,
      nama: String(regRows[r][1] || '').trim(),
      hadir: c.hadir, izin: c.izin, alfa: c.alfa
    });
  }
  result.sort(function(a, b) {
    return (b.hadir - a.hadir) || String(a.nama).localeCompare(String(b.nama));
  });
  return { success: true, data: result, bulan: bln, tahun: thn };
}

function handleGetPendingUsers(data) {
  if (!isAdminValid(data.adminToken)) return { success: false };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getDisplayValues(), result = [];
  for (var i = 1; i < rows.length; i++) {
    // [8]=Status Akun, [11]=ID Unik, [1]=Nama, [2]=NIM, [3]=Kampus, [4]=Jurusan
    if (rows[i][8] === 'pending') result.push({ id: rows[i][11], nama: rows[i][1], nim: rows[i][2], kampus: rows[i][3], jurusan: rows[i][4] });
  }
  return { success: true, data: result };
}

function handleApproveUser(data) {
  if (!isAdminValid(data.adminToken)) return { success: false };
  var sheet = getSheet('WEB Register');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][11]) === String(data.idPeserta)) {
      // Header WEB Register: [8]=Status Akun (kolom 9), [10]=ID Lokasi (kolom 11)
      sheet.getRange(i + 1, 9).setValue('active');         // Status Akun
      if (data.idLokasi) sheet.getRange(i + 1, 11).setValue(data.idLokasi); // ID Lokasi
      return { success: true, message: 'Disetujui.' };
    }
  }
  return { success: false };
}

function handleRejectUser(data) {
  return handleDeleteUserAdmin(data);
}



// ============================================================

function handleGetAllUsersAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1]) {
      var fotoUrl = rows[i][7] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s200';
      }
      // Header WEB Register:
      // [0]=Timestamp, [1]=Nama, [2]=NIM, [3]=Kampus, [4]=Jurusan,
      // [5]=Tgl Mulai, [6]=Tgl Selesai, [7]=Foto, [8]=Status Akun,
      // [9]=Role, [10]=ID Lokasi, [11]=ID Unik
      list.push({
        id:            rows[i][11],
        nim:           rows[i][2] || '',
        nama:          rows[i][1],
        kampus:        rows[i][3],
        jurusan:       rows[i][4],
        mulaiMagang:   normalizeTanggal(rows[i][5]),
        selesaiMagang: normalizeTanggal(rows[i][6]),
        foto:          fotoUrl,
        status:        rows[i][8] || 'active',
        role:          rows[i][9] || 'intern',
        idLokasi:      rows[i][10] || ''
      });
    }
  }
  return { success: true, data: list };
}

// INTEGRASI META WHATSAPP CLOUD API (PENGINGAT PRESENSI MASUK)
// ============================================================

/**
 * Normalisasi format nomor WhatsApp ke standar internasional tanpa tanda '+'
 * Contoh: 08123456789 -> 628123456789
 */
function formatNoHpWhatsApp(noHp) {
  if (!noHp) return '';
  // Cek jika ini adalah ID Grup Fonnte (ada tanda minus, @g.us, atau panjang > 15 angka dan berawalan 120)
  if (String(noHp).indexOf('-') !== -1 || String(noHp).indexOf('@g.us') !== -1 || (String(noHp).length > 15 && String(noHp).startsWith('120'))) {
    return String(noHp).trim();
  }
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
function testKirimWhatsAppFonnte() {
  var noHpTest = '081535481447'; // Nomor pengujian Anda
  var pesan = "Halo! Saya *ence dari Daop 8* ðŸš‚\nIni adalah pesan uji coba Bot Pengingat Presensi KAI Daop 8 via Fonnte. Sistem siap digunakan!";
  
  Logger.log('Memulai uji coba pengiriman WA Fonnte ke ' + noHpTest);
  var res = kirimWhatsAppFonnte(noHpTest, pesan);
  Logger.log('Hasil Uji Coba: ' + JSON.stringify(res));
}

// ============================================================
// HANDLER: getPenugasanPublic
// Endpoint publik â€” siapa pun bisa ambil daftar unit kerja & lokasi
// Tidak butuh token karena data ini hanya read-only & tidak sensitif.
// ============================================================
function handleGetPenugasanPublic(data) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('penugasan_public_v1');
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  
  var sheet = getSheet('WEB Penugasan');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();
  var lokasiList = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][1] === 'lokasi') {
      lokasiList.push({
        id: rows[i][0],
        idInduk: rows[i][2],
        nama: rows[i][3],
        lat: parseFloat(rows[i][6]) || null,
        lng: parseFloat(rows[i][3]) || null,
        radius: parseInt(rows[i][4]) || 100
      });
    }
  }
  try { cache.put('penugasan_public_v1', JSON.stringify(lokasiList), 21600); } catch(e){}
  return { success: true, data: lokasiList };
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
  var unitKerjaNama = 'â€”';
  if (idInduk) {
    for (var k = 1; k < penRows.length; k++) {
      if (penRows[k][0] === idInduk && penRows[k][1] === 'unit_kerja') {
        unitKerjaNama = penRows[k][3];
        break;
      }
    }
  }

  // Update idLokasi di WEB Register — Header: [10]=ID Lokasi (kolom 11)
  var regSheet = getSheet('WEB Register');
  if (!regSheet) return { success: false, message: 'Sheet registrasi tidak ditemukan.' };
  var regRows = regSheet.getDataRange().getDisplayValues();
  for (var i = 1; i < regRows.length; i++) {
    if (regRows[i][11] === idPeserta) {
      regSheet.getRange(i + 1, 11).setValue(data.idLokasi); // kolom 11 = index [10] = ID Lokasi
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

function mintaIzinWA() {
  UrlFetchApp.fetch("https://api.fonnte.com/");
}


// â”€â”€â”€ DATE & TIME HELPER FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Fungsi-fungsi ini WAJIB ada agar tanggal tidak dikirim sebagai
// raw Date object (ISO string) ke frontend.

/**
 * Format tanggal menjadi DD/MM/YYYY.
 * Jika tanpa argumen gunakan tanggal hari ini.
 */
function formatTanggal(dateStr) {
  var d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    if (typeof dateStr === 'string' && dateStr.indexOf('/') !== -1) return dateStr;
    d = new Date();
  }
  return [String(d.getDate()).padStart(2, '0'),
          String(d.getMonth() + 1).padStart(2, '0'),
          d.getFullYear()].join('/');
}

/**
 * Normalisasi berbagai format tanggal ke DD/MM/YYYY.
 * Menangani: Date Object, "DD/MM/YYYY", "M/D/YYYY" (Google Sheets US locale),
 *            "YYYY-MM-DD" (ISO dari HTML date input / frontend)
 */
function normalizeTanggal(tglStr) {
  if (!tglStr) return '';
  if (tglStr instanceof Date) {
    return String(tglStr.getDate()).padStart(2, '0') + '/' +
           String(tglStr.getMonth() + 1).padStart(2, '0') + '/' +
           tglStr.getFullYear();
  }
  var s = String(tglStr).trim();
  var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[3] + '/' + isoMatch[2] + '/' + isoMatch[1];
  var parts = s.split('/');
  if (parts.length !== 3) return s;
  var n0 = parseInt(parts[0], 10), n1 = parseInt(parts[1], 10), yr = parts[2];
  var day, month;
  if (n0 > 12)                                { day = n0; month = n1; }
  else if (n1 > 12)                           { month = n0; day = n1; }
  else if (parts[0].length === 2 && parts[0].charAt(0) === '0') { day = n0; month = n1; }
  else                                        { month = n0; day = n1; }
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) return s;
  return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + yr;
}

/**
 * Format jam dari Date object atau string menjadi HH:MM:SS
 */
function formatJam(dateObj) {
  if (!dateObj) return '';
  if (typeof dateObj === 'string' && dateObj.indexOf(':') !== -1) {
    var parts = dateObj.split(' ');
    return parts[parts.length - 1];
  }
  var d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return [String(d.getHours()).padStart(2, '0'),
          String(d.getMinutes()).padStart(2, '0'),
          String(d.getSeconds()).padStart(2, '0')].join(':');
}

/**
 * Hitung selisih jam masuk dan pulang. Format: HH:MM atau HH:MM:SS
 * Return: "Xj Ym Zd"
 */
function hitungTotalJam(jamMasuk, jamPulang) {
  if (!jamMasuk || !jamPulang) return '';
  try {
    var pm = String(jamMasuk).trim().split(':').map(Number);
    var pp = String(jamPulang).trim().split(':').map(Number);
    if (pm.length < 2 || pp.length < 2) return '';
    if (isNaN(pm[0]) || isNaN(pm[1]) || isNaN(pp[0]) || isNaN(pp[1])) return '';
    var detikMasuk  = pm[0] * 3600 + pm[1] * 60 + (pm[2] || 0);
    var detikPulang = pp[0] * 3600 + pp[1] * 60 + (pp[2] || 0);
    var selisih = detikPulang - detikMasuk;
    if (selisih <= 0) return '0j 0m 0d';
    return Math.floor(selisih / 3600) + 'j ' +
           Math.floor((selisih % 3600) / 60) + 'm ' +
           (selisih % 60) + 'd';
  } catch(e) { return ''; }
}

/**
 * Upload foto (base64) ke Google Drive dan return URL publik
 */
function uploadFoto(base64Data, filename) {
  try {
    var clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    var folder;
    try { folder = DriveApp.getFolderById(CONFIG.FOLDER_FOTO_ID); }
    catch(e) { folder = DriveApp.getRootFolder(); }
    var file = folder.createFile(
      Utilities.newBlob(Utilities.base64Decode(clean), 'image/jpeg', filename)
    );
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch(err) { return ''; }
}

/**
 * Validasi admin token
 */
function isAdminValid(adminToken) {
  return adminToken === CONFIG.ADMIN_TOKEN;
}

/**
 * Hitung jarak antara dua koordinat (Haversine formula)
 * Return: jarak dalam meter
 */
function hitungJarak(lat1, lon1, lat2, lon2) {
  var R = 6371e3; // radius bumi dalam meter
  var phi1 = lat1 * Math.PI / 180;
  var phi2 = lat2 * Math.PI / 180;
  var deltaPhi = (lat2 - lat1) * Math.PI / 180;
  var deltaLambda = (lon2 - lon1) * Math.PI / 180;

  var a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


// --- ADMIN LOKASI PENUGASAN ---

function handleGetPenugasan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Penugasan');
  if (!sheet) return { success: true, data: { unitList: [], lokasiList: [] } };
  
  var rows = sheet.getDataRange().getValues();
  var unitList = [], lokasiList = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][1] === 'unit_kerja') {
      unitList.push({ id: rows[i][0], nama: rows[i][3] });
    } else if (rows[i][1] === 'lokasi') {
      lokasiList.push({
        id: rows[i][0],
        idInduk: rows[i][2],
        nama: rows[i][3],
        alamat: rows[i][4] || '',
        lat: rows[i][5] || '',
        lng: rows[i][6] || '',
        radius: parseInt(rows[i][7]) || 100
      });
    }
  }
  return { success: true, data: { unitList: unitList, lokasiList: lokasiList } };
}

function handleSavePenugasan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getOrCreateSheet('WEB Penugasan');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'TIPE', 'ID_INDUK', 'NAMA', 'ALAMAT', 'LATITUDE', 'LONGITUDE', 'RADIUS']);
  }
  
  var rows = sheet.getDataRange().getValues();
  if (data.id) {
    // Edit
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 4).setValue(data.nama);
        if (data.tipe === 'lokasi') {
          sheet.getRange(i + 1, 5).setValue(data.alamat || '');
          sheet.getRange(i + 1, 6).setValue(data.lat || '');
          sheet.getRange(i + 1, 7).setValue(data.lng || '');
          sheet.getRange(i + 1, 8).setValue(data.radius || 100);
        }
        return { success: true, message: 'Berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan.' };
  } else {
    // Tambah baru
    var newId = (data.tipe === 'unit_kerja' ? 'UK-' : 'LOK-') + Date.now();
    var lat = data.lat || '';
    var lng = data.lng || '';
    var radius = data.radius || 100;
    var alamat = data.alamat || '';
    sheet.appendRow([newId, data.tipe, data.idInduk || '', data.nama, alamat, lat, lng, radius]);
    return { success: true, message: 'Berhasil ditambahkan.' };
  }
}

function handleDeletePenugasan(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Penugasan');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  
  var rows = sheet.getDataRange().getValues();
  var idsToDelete = [data.id];
  
  // Jika hapus unit kerja, kumpulkan id lokasi anak-anaknya juga
  for (var k = 1; k < rows.length; k++) {
    if (rows[k][0] === data.id && rows[k][1] === 'unit_kerja') {
      for (var j = 1; j < rows.length; j++) {
        if (rows[j][2] === data.id) idsToDelete.push(rows[j][0]);
      }
      break;
    }
  }
  
  var deleted = false;
  // Hapus dari bawah ke atas agar index baris tidak berantakan
  for (var i = rows.length - 1; i >= 1; i--) {
    if (idsToDelete.indexOf(rows[i][0]) !== -1) {
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }
  
  if (deleted) return { success: true, message: 'Berhasil dihapus.' };
  return { success: false, message: 'Data tidak ditemukan.' };
}

function handleAssignLokasi(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][11]) === String(data.idPeserta)) {
      sheet.getRange(i + 1, 11).setValue(data.idLokasi || ''); // Kolom 11 = index [10] = ID Lokasi
      return { success: true, message: 'Penempatan berhasil diperbarui.' };
    }
  }
  return { success: false, message: 'Peserta tidak ditemukan.' };
}

// DUMMY FUNCTIONS UNTUK MENCEGAH ERROR DARI TRIGGER LAMA MILIK PENGGUNA LAIN
function kirimPengingatPresensiMasuk() {
  Logger.log('Trigger lama (Masuk) dijalankan, tapi sudah dinonaktifkan.');
}
function kirimPengingatPresensiPulang() {
  Logger.log('Trigger lama (Pulang) dijalankan, tapi sudah dinonaktifkan.');
}
function kirimPengingatMasukAuto() {}
function kirimPengingatMasukJumatAuto() {}
function kirimPengingatPulangAuto() {}
function kirimPengingatPulangJumatAuto() {}
