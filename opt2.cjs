const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

const oldRegex = /function handleGetPenugasanPublic\(data\) \{[\s\S]*?return \{ success: true, data: \{ unitList: unitList, lokasiList: lokasiList \} \};\s*\}/;

const newFunc = `function handleGetPenugasanPublic(data) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('penugasan_public_v1');
  if (cached) {
    try {
      return { success: true, data: JSON.parse(cached) };
    } catch (e) {}
  }

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
        lat:     parseFloat(rows[i][6]) || null,
        lng:     parseFloat(rows[i][7]) || null,
        radius:  parseInt(rows[i][8]) || 100
      });
    }
  }

  var resData = { unitList: unitList, lokasiList: lokasiList };
  try { cache.put('penugasan_public_v1', JSON.stringify(resData), 300); } catch(e) {}
  return { success: true, data: resData };
}`;

code = code.replace(oldRegex, newFunc);
fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('done');
