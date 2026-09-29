const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// 1. Fix handleGetAllUsersAdmin NIM
code = code.replace(
  /id: rows\[i\]\[15\],/,
  "id: rows[i][15],\n        nim: rows[i][5] || '',"
);

// 2. Fix handleSaveUserAdmin
const replaceNewSave = `function handleSaveUserAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  var rows = sheet.getDataRange().getDisplayValues();
  
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][15] === data.id) {
        if (data.nama !== undefined) sheet.getRange(i + 1, 2).setValue(data.nama.trim());
        if (data.tanggalLahir !== undefined) sheet.getRange(i + 1, 3).setValue(data.tanggalLahir.trim());
        if (data.alamat !== undefined) sheet.getRange(i + 1, 4).setValue(data.alamat);
        if (data.noHp !== undefined) sheet.getRange(i + 1, 5).setValue(data.noHp);
        if (data.nim !== undefined) sheet.getRange(i + 1, 6).setValue(data.nim.trim());
        if (data.email !== undefined) sheet.getRange(i + 1, 7).setValue(data.email);
        if (data.kampus !== undefined) sheet.getRange(i + 1, 8).setValue(data.kampus);
        if (data.jurusan !== undefined) sheet.getRange(i + 1, 9).setValue(data.jurusan);
        if (data.mulaiMagang !== undefined) sheet.getRange(i + 1, 10).setValue(data.mulaiMagang);
        if (data.selesaiMagang !== undefined) sheet.getRange(i + 1, 11).setValue(data.selesaiMagang);
        if (data.status !== undefined) sheet.getRange(i + 1, 13).setValue(data.status);
        if (data.role !== undefined) sheet.getRange(i + 1, 14).setValue(data.role);
        if (data.idLokasi !== undefined) sheet.getRange(i + 1, 15).setValue(data.idLokasi);
        return { success: true, message: 'Data peserta berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Peserta tidak ditemukan.' };
  } else {
    var newId = generatePesertaId();
    sheet.appendRow([
      new Date().toISOString(),
      (data.nama || '').trim(),
      (data.tanggalLahir || '').trim(),
      data.alamat || '',
      data.noHp || '',
      (data.nim || '').trim(),
      data.email || '',
      data.kampus || '',
      data.jurusan || '',
      data.mulaiMagang || '',
      data.selesaiMagang || '',
      '',
      data.status || 'active',
      data.role || 'intern',
      data.idLokasi || '',
      newId
    ]);
    return { success: true, message: 'Peserta baru berhasil ditambahkan.', id: newId };
  }
}`;
code = code.replace(/function handleSaveUserAdmin\(data\) \{[\s\S]*?\} else \{\s*var newId = generatePesertaId\(\);[\s\S]*?return \{ success: true, message: 'Peserta baru berhasil ditambahkan\.' \};\s*\}\s*\}/, replaceNewSave);

// 3. Remove duplicate handleGetAllUsersAdmin
code = code.replace(/function handleGetAllUsersAdmin\(data\) \{[\s\S]*?idLokasi:\s*rows\[i\]\[14\] \|\| ''\s*\}\);\s*\}\s*\}\s*return \{ success: true, data: list \};\s*\}/g, '');

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('Fixed Handlers.gs completely');
