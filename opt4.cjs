const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// 1. handleGetStatusHariIni
const getOldRegex = /function handleGetStatusHariIni\(data\) \{[\s\S]*?return \{ success: true, data: \{ sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null \} \};\s*\}/;

const getNew = `function handleGetStatusHariIni(data) {
  if (!validateSession(data.token)) return { success: false, message: 'Sesi tidak valid.' };
  var today = formatTanggal();
  var cacheKey = 'status_' + data.idPeserta + '_' + normalizeTanggal(today);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  
  if (cached) {
    try { return { success: true, data: JSON.parse(cached) }; } catch(e) {}
  }

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
  
  try { cache.put(cacheKey, JSON.stringify(statusData), 21600); } catch(e) {}
  return { success: true, data: statusData };
}`;
code = code.replace(getOldRegex, getNew);

// 2. Update Cache in handleCheckIn
code = code.replace(
  /dataSheet\.appendRow\(\[today, data\.idPeserta, peserta\[1\], namaLokasi, jamMasuk, fotoUrl, '', '', '', data\.latitude\+','\+data\.longitude, '', 'Hadir'\]\);\s*return \{ success: true, jamMasuk: jamMasuk \};/,
  `dataSheet.appendRow([today, data.idPeserta, peserta[1], namaLokasi, jamMasuk, fotoUrl, '', '', '', data.latitude+','+data.longitude, '', 'Hadir']);
  try {
    CacheService.getScriptCache().put('status_' + data.idPeserta + '_' + todayNorm, JSON.stringify({ sudahMasuk: true, sudahPulang: false, jamMasuk: jamMasuk, jamPulang: null }), 21600);
  } catch(e) {}
  return { success: true, jamMasuk: jamMasuk };`
);

// 3. Update Cache in handleCheckOut
code = code.replace(
  /var jamMasuk = rowData\[4\];/,
  `var jamMasuk = rowData[4];
  try {
    CacheService.getScriptCache().put('status_' + data.idPeserta + '_' + todayNormCO, JSON.stringify({ sudahMasuk: true, sudahPulang: true, jamMasuk: jamMasuk, jamPulang: jamPulang }), 21600);
  } catch(e) {}`
);

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('done');
