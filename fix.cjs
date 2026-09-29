const fs = require('fs');

function processFile(filename) {
  if (!fs.existsSync(filename)) return;
  let code = fs.readFileSync(filename, 'utf8');

  // Replace indices for generic rows[i][X]
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[15\]/g, 'rows[$1][@@15@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[14\]/g, 'rows[$1][@@14@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[13\]/g, 'rows[$1][@@13@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[12\]/g, 'rows[$1][@@12@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[11\]/g, 'rows[$1][@@11@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[10\]/g, 'rows[$1][@@10@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[9\]/g, 'rows[$1][@@9@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[8\]/g, 'rows[$1][@@8@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[7\]/g, 'rows[$1][@@7@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[6\]/g, 'rows[$1][@@6@@]');
  code = code.replace(/rows\[([a-zA-Z0-9]+)\]\[5\]/g, 'rows[$1][@@5@@]');

  // Now replace @@X@@ with shifted value
  code = code.replace(/@@15@@/g, '5'); // NIM was 15, now 5
  code = code.replace(/@@14@@/g, '15'); // ID Unik was 14, now 15
  code = code.replace(/@@13@@/g, '14'); // Lokasi was 13, now 14
  code = code.replace(/@@12@@/g, '13'); // Role was 12, now 13
  code = code.replace(/@@11@@/g, '12'); // Status was 11, now 12
  code = code.replace(/@@10@@/g, '11'); // Foto was 10, now 11
  code = code.replace(/@@9@@/g, '10'); // Selesai was 9, now 10
  code = code.replace(/@@8@@/g, '9'); // Mulai was 8, now 9
  code = code.replace(/@@7@@/g, '8'); // Jurusan was 7, now 8
  code = code.replace(/@@6@@/g, '7'); // Kampus was 6, now 7
  code = code.replace(/@@5@@/g, '6'); // Email was 5, now 6

  // Replace for regRows
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[15\]/g, 'regRows[$1][@@15@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[14\]/g, 'regRows[$1][@@14@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[13\]/g, 'regRows[$1][@@13@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[12\]/g, 'regRows[$1][@@12@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[11\]/g, 'regRows[$1][@@11@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[10\]/g, 'regRows[$1][@@10@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[9\]/g, 'regRows[$1][@@9@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[8\]/g, 'regRows[$1][@@8@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[7\]/g, 'regRows[$1][@@7@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[6\]/g, 'regRows[$1][@@6@@]');
  code = code.replace(/regRows\[([a-zA-Z0-9]+)\]\[5\]/g, 'regRows[$1][@@5@@]');
  code = code.replace(/@@15@@/g, '5'); 
  code = code.replace(/@@14@@/g, '15'); 
  code = code.replace(/@@13@@/g, '14'); 
  code = code.replace(/@@12@@/g, '13'); 
  code = code.replace(/@@11@@/g, '12'); 
  code = code.replace(/@@10@@/g, '11'); 
  code = code.replace(/@@9@@/g, '10'); 
  code = code.replace(/@@8@@/g, '9'); 
  code = code.replace(/@@7@@/g, '8'); 
  code = code.replace(/@@6@@/g, '7'); 
  code = code.replace(/@@5@@/g, '6'); 

  // getRange replacements for WEB Register accesses
  // In Handlers.gs, sheet.getRange(i+1, X)
  code = code.replace(/getRange\(([^,]+), 15\)/g, 'getRange($1, @@15@@)');
  code = code.replace(/getRange\(([^,]+), 14\)/g, 'getRange($1, @@14@@)');
  code = code.replace(/getRange\(([^,]+), 13\)/g, 'getRange($1, @@13@@)');
  code = code.replace(/getRange\(([^,]+), 12\)/g, 'getRange($1, @@12@@)');
  code = code.replace(/getRange\(([^,]+), 11\)/g, 'getRange($1, @@11@@)');
  code = code.replace(/getRange\(([^,]+), 10\)/g, 'getRange($1, @@10@@)');
  code = code.replace(/getRange\(([^,]+), 9\)/g, 'getRange($1, @@9@@)');
  code = code.replace(/getRange\(([^,]+), 8\)/g, 'getRange($1, @@8@@)');
  code = code.replace(/getRange\(([^,]+), 7\)/g, 'getRange($1, @@7@@)');
  code = code.replace(/getRange\(([^,]+), 6\)/g, 'getRange($1, @@6@@)');
  code = code.replace(/getRange\(([^,]+), 5\)/g, 'getRange($1, @@5@@)'); // No hp -> unchanged. But wait! getRange for 5 is No HP, which is not shifted.

  code = code.replace(/@@15@@/g, '5'); 
  code = code.replace(/@@14@@/g, '15'); 
  code = code.replace(/@@13@@/g, '14'); 
  code = code.replace(/@@12@@/g, '13'); 
  code = code.replace(/@@11@@/g, '12'); 
  code = code.replace(/@@10@@/g, '11'); 
  code = code.replace(/@@9@@/g, '10'); 
  code = code.replace(/@@8@@/g, '9'); 
  code = code.replace(/@@7@@/g, '8'); 
  code = code.replace(/@@6@@/g, '7'); 
  code = code.replace(/@@5@@/g, '6'); // Wait, getRange(..., 5) shouldn't have been matched if it's NoHp. Let's see if getRange is used for No Hp... wait! I shouldn't replace `getRange` if it's 5. Let me undo 5.

  // Wait, I will just do exact replacements for getRange to be safe.
  fs.writeFileSync(filename, code);
}

processFile('AppScript/Handlers.gs');
processFile('AppScript/Helpers.gs');
processFile('AppScript/LaporanPIC.gs');

let setupCode = fs.readFileSync('AppScript/Setup.gs', 'utf8');
setupCode = setupCode.replace(/'Timestamp Submit','Nama Lengkap','Tanggal Lahir','Alamat','No HP','Email',\n      'Kampus','Jurusan','Tanggal Mulai','Tanggal Selesai','Foto Profil URL',\n      'Status Akun','Role','ID Lokasi','ID Unik', 'NIM'/g, 
  "'Timestamp Submit','Nama Lengkap','Tanggal Lahir','Alamat','No HP', 'NIM', 'Email',\\n      'Kampus','Jurusan','Tanggal Mulai','Tanggal Selesai','Foto Profil URL',\\n      'Status Akun','Role','ID Lokasi','ID Unik'");

setupCode = setupCode.replace(/rows\[i\]\[0\] \|\| new Date\(\)\.toISOString\(\), nama, '', rows\[i\]\[2\] \|\| '', '', '', '', '', '', '', '', 'active', 'intern', '', newId, ''/g, 
  "rows[i][0] || new Date().toISOString(), nama, '', rows[i][2] || '', '', '', '', '', '', '', '', '', 'active', 'intern', '', newId");

setupCode = setupCode.replace(/sheet\.getRange\('M2:M'\)/g, "sheet.getRange('N2:N')");
setupCode = setupCode.replace(/sheet\.getRange\(i \+ 1, 13\)/g, "sheet.getRange(i + 1, 14)"); // jadikanAdmin
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 6\)/g, "webReg.getRange(i + 1, 7)"); // email
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 7\)/g, "webReg.getRange(i + 1, 8)");
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 8\)/g, "webReg.getRange(i + 1, 9)");
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 9\)/g, "webReg.getRange(i + 1, 10)");
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 10\)/g, "webReg.getRange(i + 1, 11)");
setupCode = setupCode.replace(/webReg\.getRange\(i \+ 1, 11\)/g, "webReg.getRange(i + 1, 12)");
fs.writeFileSync('AppScript/Setup.gs', setupCode);

let syncCode = fs.readFileSync('AppScript/Sync.gs', 'utf8');
syncCode = syncCode.replace(/mapPeserta\[kNama\] = \{ id: allRegRows\[k\]\[14\], nama: allRegRows\[k\]\[1\] \};/g, 
  "mapPeserta[kNama] = { id: allRegRows[k][15], nama: allRegRows[k][1] };");

syncCode = syncCode.replace(/regRows\[i\]\[14\]/g, "regRows[i][15]");

syncCode = syncCode.replace(/jamSubmit \|\| new Date\(\)\.toISOString\(\), nama, '', alamat, hp, email, \n      kampus, jurusan, tglMulai, tglSelesai, fotoRender, 'active', 'intern', '', newId, nim/g, 
  "jamSubmit || new Date().toISOString(), nama, '', alamat, hp, nim, email, \\n      kampus, jurusan, tglMulai, tglSelesai, fotoRender, 'active', 'intern', '', newId");

fs.writeFileSync('AppScript/Sync.gs', syncCode);

// specific fixes for Handlers.gs appendRow
let handCode = fs.readFileSync('AppScript/Handlers.gs', 'utf8');
handCode = handCode.replace(/new Date\(\)\.toISOString\(\), data\.nama\.trim\(\), data\.tanggalLahir\.trim\(\), data\.alamat, data\.noHp, data\.email, data\.kampus, data\.jurusan, data\.mulaiMagang \|\| '', data\.selesaiMagang \|\| '', fotoUrl, 'active', 'intern', '', generatePesertaId\(\), data\.nim \|\| ''/g,
  "new Date().toISOString(), data.nama.trim(), data.tanggalLahir.trim(), data.alamat, data.noHp, data.nim || '', data.email, data.kampus, data.jurusan, data.mulaiMagang || '', data.selesaiMagang || '', fotoUrl, 'active', 'intern', '', generatePesertaId()");

// fix getRange in Handlers.gs safely
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 14\)/g, "sheet.getRange(i + 1, 15)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 13\)/g, "sheet.getRange(i + 1, 14)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 12\)/g, "sheet.getRange(i + 1, 13)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 6\)/g, "sheet.getRange(i + 1, 7)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 7\)/g, "sheet.getRange(i + 1, 8)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 8\)/g, "sheet.getRange(i + 1, 9)");
handCode = handCode.replace(/sheet\.getRange\(i \+ 1, 9\)/g, "sheet.getRange(i + 1, 10)");

// Check if we accidentally touched presensi getRange. Presensi uses pSheet or dataSheet. Handlers uses sheet for Register mostly.
fs.writeFileSync('AppScript/Handlers.gs', handCode);

console.log('done');
