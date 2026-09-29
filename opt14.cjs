const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// Function replacer helper
function replaceFunction(codeStr, funcName, newBody) {
  const regex = new RegExp('function ' + funcName + '\\(data\\) \\{[\\s\\S]*?\\n\\}', 'g');
  if (codeStr.match(regex)) {
    return codeStr.replace(regex, newBody);
  } else {
    console.log("Could not find function: " + funcName);
    return codeStr;
  }
}

let handleGetStatusHariIniNew = `function handleGetStatusHariIni(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var today = formatTanggal();
  var cacheKey = 'status_' + data.idPeserta + '_' + normalizeTanggal(today);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null } };
  var rows = sheet.getDataRange().getValues();
  var statusData = { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null };
  for (var i = rows.length - 1; i >= 1; i--) {
    if (normalizeTanggal(rows[i][0]) === normalizeTanggal(today) && rows[i][1] === data.idPeserta) {
      statusData = { sudahMasuk: !!rows[i][4], sudahPulang: !!rows[i][6], jamMasuk: rows[i][4] || null, jamPulang: rows[i][6] || null };
      break;
    }
  }
  try { cache.put(cacheKey, JSON.stringify(statusData), 21600); } catch(e){}
  return { success: true, data: statusData };
}`;

let handleGetRiwayatNew = `function handleGetRiwayat(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var cacheKey = 'riwayat_' + data.idPeserta;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === data.idPeserta) {
      var dStr = String(rows[i][0] || '');
      result.push({
        tanggal: normalizeTanggal(dStr),
        jamMasuk: rows[i][4] || null,
        jamPulang: rows[i][6] || null,
        lokasiMasuk: rows[i][5] || null,
        lokasiPulang: rows[i][7] || null,
        status: (rows[i][6]) ? 'Hadir' : 'Belum Pulang'
      });
      if (result.length >= 31) break;
    }
  }
  try { cache.put(cacheKey, JSON.stringify(result), 21600); } catch(e){}
  return { success: true, data: result };
}`;

let handleGetPenugasanPublicNew = `function handleGetPenugasanPublic(data) {
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
        lng: parseFloat(rows[i][7]) || null,
        radius: parseInt(rows[i][8]) || 100
      });
    }
  }
  try { cache.put('penugasan_public_v1', JSON.stringify(lokasiList), 21600); } catch(e){}
  return { success: true, data: lokasiList };
}`;

// Note: handleLogin is slightly more complex, but we can replace its getDisplayValues to getValues.
code = code.replace(/var rows = sheet\.getDataRange\(\)\.getDisplayValues\(\);/g, 'var rows = sheet.getDataRange().getValues();');

// Also invalidation in CheckIn and CheckOut
code = code.replace(/return \{ success: true, message: 'Berhasil Check-In' \};/g, 
  `try { CacheService.getScriptCache().remove('status_' + data.idPeserta + '_' + normalizeTanggal(today)); } catch(e){}\n      try { CacheService.getScriptCache().remove('riwayat_' + data.idPeserta); } catch(e){}\n      return { success: true, message: 'Berhasil Check-In' };`
);
code = code.replace(/return \{ success: true, message: 'Berhasil Check-Out' \};/g, 
  `try { CacheService.getScriptCache().remove('status_' + data.idPeserta + '_' + normalizeTanggal(today)); } catch(e){}\n        try { CacheService.getScriptCache().remove('riwayat_' + data.idPeserta); } catch(e){}\n        return { success: true, message: 'Berhasil Check-Out' };`
);


code = replaceFunction(code, 'handleGetStatusHariIni', handleGetStatusHariIniNew);
code = replaceFunction(code, 'handleGetRiwayat', handleGetRiwayatNew);
code = replaceFunction(code, 'handleGetPenugasanPublic', handleGetPenugasanPublicNew);

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('Performance optimizations fully restored!');
