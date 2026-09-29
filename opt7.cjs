const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

const regexOld = /function handleSaveUserAdmin\(data\) \{[\s\S]*?\} else \{\s*var newId = generatePesertaId\(\);[\s\S]*?return \{ success: true, message: 'Peserta baru berhasil ditambahkan\.', id: newId \};\s*\}\s*\}/;

const replaceNew = `function handleSaveUserAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  var rows = sheet.getDataRange().getDisplayValues();
  
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][15] === data.id) { // ID Unik is at column 16 (index 15)
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
      new Date().toISOString(), // 1
      (data.nama || '').trim(), // 2
      (data.tanggalLahir || '').trim(), // 3
      data.alamat || '', // 4
      data.noHp || '', // 5
      (data.nim || '').trim(), // 6
      data.email || '', // 7
      data.kampus || '', // 8
      data.jurusan || '', // 9
      data.mulaiMagang || '', // 10
      data.selesaiMagang || '', // 11
      '', // 12 fotoUrl kosong
      data.status || 'active', // 13
      data.role || 'intern', // 14
      data.idLokasi || '', // 15
      newId // 16
    ]);
    return { success: true, message: 'Peserta baru berhasil ditambahkan.', id: newId };
  }
}`;

code = code.replace(regexOld, replaceNew);
fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('Backend done');

let ap = fs.readFileSync('src/pages/admin/AdminPeserta.jsx', 'utf8');
ap = ap.replace(/tanggalLahir: '',/g, "tanggalLahir: '',\n      nim: '',");
ap = ap.replace(/tanggalLahir: user\.tanggalLahir \|\| '',/g, "tanggalLahir: user.tanggalLahir || '',\n        nim: user.nim || '',");
fs.writeFileSync('src/pages/admin/AdminPeserta.jsx', ap);
console.log('AdminPeserta done');

let modal = fs.readFileSync('src/pages/admin/components/AdminPesertaModal.jsx', 'utf8');
const nimInput = `
            <div className="lok-form-group">
              <label>NIM (Nomor Induk Mahasiswa)</label>
              <input
                type="text"
                className="lok-form-input"
                placeholder="Misal: 12345678"
                value={formData.nim || ''}
                onChange={e => setFormData({ ...formData, nim: e.target.value })}
              />
            </div>
`;
modal = modal.replace('{/* Tanggal Lahir \u2014 Date Picker Modern */}', nimInput + '\n            {/* Tanggal Lahir \u2014 Date Picker Modern */}');
fs.writeFileSync('src/pages/admin/components/AdminPesertaModal.jsx', modal);
console.log('Modal done');
