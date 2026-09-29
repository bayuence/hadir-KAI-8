const fs = require('fs');

// 1. Update Handlers.gs
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

code = code.replace(/var nama = data\.nama, tglLahir = data\.tanggalLahir;\s*if \(\!nama \|\| \!tglLahir\) return \{ success: false, message: 'Nama dan tanggal lahir harus diisi' \};/,
  "var nama = data.nama, nim = data.nim;\n  if (!nama || !nim) return { success: false, message: 'Nama dan NIM harus diisi' };");

code = code.replace(/var inputTglNorm = normalizeTanggalLahir\(tglLahir\);/, "");

code = code.replace(/var rowTgl = rows\[i\]\[2\]\.trim\(\);\s*if \(rowTgl === ''\) return \{ success: false, message: 'Tanggal lahir belum diatur oleh admin\. Minta admin untuk mengaturnya di WEB Register\.'\};\s*var rowTglNorm = normalizeTanggalLahir\(rowTgl\);\s*if \(rowTglNorm === inputTglNorm\) \{/,
  "var rowNim = String(rows[i][5] || '').trim();\n        if (rowNim === '') return { success: false, message: 'NIM belum diatur oleh admin. Minta admin untuk mengaturnya di WEB Register.'};\n        if (rowNim.toLowerCase() === String(nim).toLowerCase().trim()) {");

fs.writeFileSync('AppScript/Handlers.gs', code);

// 2. Update api.js
let apiCode = fs.readFileSync('src/services/api.js', 'utf8');
apiCode = apiCode.replace(/login: \(nama, tanggalLahir\) => fetchGAS\(\{ action: 'login', nama, tanggalLahir \}\),/,
  "login: (nama, nim) => fetchGAS({ action: 'login', nama, nim }),");
fs.writeFileSync('src/services/api.js', apiCode);

console.log('done');
