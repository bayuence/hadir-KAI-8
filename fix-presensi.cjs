const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// handleCheckOut
code = code.replace(/if \(normalizeTanggal\(rows\[i\]\[0\]\) === todayNormCO && rows\[i\]\[1\] === data.idPeserta && rows\[i\]\[4\] && !rows\[i\]\[7\]\) \{ targetRow = i \+ 1; break; \}/g,
  "if (normalizeTanggal(rows[i][0]) === todayNormCO && rows[i][1] === data.idPeserta && rows[i][4] && !rows[i][6]) { targetRow = i + 1; break; }");

code = code.replace(/dataSheet\.getRange\(targetRow, 8\)\.setValue\(jamPulang\);/g, "dataSheet.getRange(targetRow, 7).setValue(jamPulang);");
code = code.replace(/dataSheet\.getRange\(targetRow, 9\)\.setValue\(fotoUrl\);/g, "dataSheet.getRange(targetRow, 8).setValue(fotoUrl);");
code = code.replace(/dataSheet\.getRange\(targetRow, 10\)\.setValue\(totalJam\);/g, "dataSheet.getRange(targetRow, 9).setValue(totalJam);");
code = code.replace(/dataSheet\.getRange\(targetRow, 12\)\.setValue\(data\.latitude \+ ',' \+ data\.longitude\);/g, "dataSheet.getRange(targetRow, 11).setValue(data.latitude + ',' + data.longitude);");

// handleGetRiwayat
code = code.replace(/result\.push\(\{ no: no\+\+, tanggal: tglNormal, lokasi: rows\[i\]\[3\], jamMasuk: rows\[i\]\[4\], fotoMasuk: rows\[i\]\[6\], jamPulang: rows\[i\]\[7\], fotoPulang: rows\[i\]\[8\], totalJam: rows\[i\]\[9\], gpsMasuk: rows\[i\]\[10\], gpsPulang: rows\[i\]\[11\], status: rows\[i\]\[12\] \}\);/g,
  "result.push({ no: no++, tanggal: tglNormal, lokasi: rows[i][3], jamMasuk: rows[i][4], fotoMasuk: rows[i][5], jamPulang: rows[i][6], fotoPulang: rows[i][7], totalJam: rows[i][8], gpsMasuk: rows[i][9], gpsPulang: rows[i][10], status: rows[i][11] });");

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('done');
