const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// 1. handleLogin to getValues
code = code.replace(
  /var rows = sheet.getDataRange\(\)\.getDisplayValues\(\);\s*for \(var i = 1; i < rows\.length; i\+\+\) \{/,
  `var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {`
);

// 2. handleGetPenugasanPublic Cache
code = code.replace(
  /function handleGetPenugasanPublic\(data\) \{\s*var sheet = getSheet\('WEB Penugasan'\);\s*if \(\!sheet\) return \{ success: true, data: \[\] \};\s*var rows = sheet\.getDataRange\(\)\.getDisplayValues\(\);/,
  `function handleGetPenugasanPublic(data) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('penugasan_public_v1');
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  var sheet = getSheet('WEB Penugasan');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();`
);
code = code.replace(
  /return \{ success: true, data: lokasiList \};\s*\}/,
  `try { cache.put('penugasan_public_v1', JSON.stringify(lokasiList), 21600); } catch(e){}
  return { success: true, data: lokasiList };
}`
);

// 3. handleGetStatusHariIni Cache
code = code.replace(
  /function handleGetStatusHariIni\(data\) \{\s*if \(\!validateSession\(data\.token\)\) return \{ success: false, message: 'Sesi tidak valid\.' \};\s*var today = formatTanggal\(\);\s*var sheet = getSheet\('WEB Presensi'\);\s*if \(\!sheet\) return \{ success: true, data: \{ sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null \} \};\s*var rows = sheet\.getDataRange\(\)\.getDisplayValues\(\);/,
  `function handleGetStatusHariIni(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var today = formatTanggal();
  var cacheKey = 'status_' + data.idPeserta + '_' + normalizeTanggal(today);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null } };
  var rows = sheet.getDataRange().getValues();`
);
code = code.replace(
  /return \{ success: true, data: statusData \};\s*\}/,
  `try { cache.put(cacheKey, JSON.stringify(statusData), 21600); } catch(e){}
  return { success: true, data: statusData };
}`
);

// 4. handleGetRiwayat Cache
code = code.replace(
  /function handleGetRiwayat\(data\) \{\s*if \(\!validateSession\(data\.token\)\) return \{ success: false, message: 'Sesi tidak valid\.' \};\s*var sheet = getSheet\('WEB Presensi'\);\s*if \(\!sheet\) return \{ success: true, data: \[\] \};\s*var rows = sheet\.getDataRange\(\)\.getDisplayValues\(\);/,
  `function handleGetRiwayat(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var cacheKey = 'riwayat_' + data.idPeserta;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) { try { return { success: true, data: JSON.parse(cached) }; } catch(e){} }
  var sheet = getSheet('WEB Presensi');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();`
);
code = code.replace(
  /return \{ success: true, data: riwayat \};\s*\}/,
  `try { cache.put(cacheKey, JSON.stringify(riwayat), 21600); } catch(e){}
  return { success: true, data: riwayat };
}`
);

// 5. Invalidation in CheckIn
code = code.replace(
  /return \{ success: true, message: 'Berhasil Check-In' \};/g,
  `try { CacheService.getScriptCache().remove('status_' + data.idPeserta + '_' + normalizeTanggal(today)); } catch(e){}
      try { CacheService.getScriptCache().remove('riwayat_' + data.idPeserta); } catch(e){}
      return { success: true, message: 'Berhasil Check-In' };`
);

// 6. Invalidation in CheckOut
code = code.replace(
  /return \{ success: true, message: 'Berhasil Check-Out' \};/g,
  `try { CacheService.getScriptCache().remove('status_' + data.idPeserta + '_' + normalizeTanggal(today)); } catch(e){}
        try { CacheService.getScriptCache().remove('riwayat_' + data.idPeserta); } catch(e){}
        return { success: true, message: 'Berhasil Check-Out' };`
);

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('Optimizations restored!');
