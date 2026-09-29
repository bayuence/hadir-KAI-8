const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// 1. handleGetRiwayat
const riwayatOld = /function handleGetRiwayat\(data\) \{[\s\S]*?return \{ success: true, data: result\.reverse\(\) \};\s*\}/;

const riwayatNew = `function handleGetRiwayat(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi invalid.' };
  
  var cacheKey = 'riwayat_' + data.idPeserta;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return { success: true, data: JSON.parse(cached) }; } catch(e) {}
  }

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
  
  var finalResult = result.reverse();
  try { cache.put(cacheKey, JSON.stringify(finalResult), 21600); } catch(e) {}
  return { success: true, data: finalResult };
}`;
code = code.replace(riwayatOld, riwayatNew);

// 2. Delete cache on Check In
code = code.replace(
  /cache\.put\(cacheKey, JSON\.stringify\(\{ sudahMasuk: true, sudahPulang: false, jamMasuk: jamMasuk, jamPulang: null \}\), 21600\);/,
  `cache.put(cacheKey, JSON.stringify({ sudahMasuk: true, sudahPulang: false, jamMasuk: jamMasuk, jamPulang: null }), 21600);
    cache.remove('riwayat_' + data.idPeserta);`
);

// 3. Delete cache on Check Out
code = code.replace(
  /cache\.put\(cacheKey, JSON\.stringify\(\{ sudahMasuk: true, sudahPulang: true, jamMasuk: jamMasuk, jamPulang: jamPulang \}\), 21600\);/,
  `cache.put(cacheKey, JSON.stringify({ sudahMasuk: true, sudahPulang: true, jamMasuk: jamMasuk, jamPulang: jamPulang }), 21600);
    cache.remove('riwayat_' + data.idPeserta);`
);

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('done');
