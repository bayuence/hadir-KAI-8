const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

const newGetAll = `
function handleGetAllUsersAdmin(data) {
  if (!isAdminValid(data.adminToken)) return { success: false, message: 'Token admin invalid.' };
  var sheet = getSheet('WEB Register');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1]) {
      var fotoUrl = rows[i][11] || '';
      if (fotoUrl) {
        var idFoto = extractDriveId(fotoUrl);
        if (idFoto) fotoUrl = 'https://lh3.googleusercontent.com/d/' + idFoto + '=s200';
      }
      list.push({
        id:            rows[i][15],
        nim:           rows[i][5] || '',
        nama:          rows[i][1],
        tanggalLahir:  rows[i][2],
        alamat:        rows[i][3],
        noHp:          rows[i][4],
        email:         rows[i][6],
        kampus:        rows[i][7],
        jurusan:       rows[i][8],
        mulaiMagang:   rows[i][9],
        selesaiMagang: rows[i][10],
        foto:          fotoUrl,
        status:        rows[i][12] || 'active',
        role:          rows[i][13] || 'intern',
        idLokasi:      rows[i][14] || ''
      });
    }
  }
  return { success: true, data: list };
}
`;

// Cek dulu apakah fungsi sudah ada
if (!code.includes('function handleGetAllUsersAdmin')) {
  // Sisipkan sebelum INTEGRASI META WHATSAPP
  const splitPoint = '// INTEGRASI META WHATSAPP CLOUD API';
  if (code.includes(splitPoint)) {
    code = code.replace(splitPoint, newGetAll + '\n' + splitPoint);
    fs.writeFileSync('AppScript/Handlers.gs', code);
    console.log('Added handleGetAllUsersAdmin back!');
  } else {
    // Append ke akhir
    fs.appendFileSync('AppScript/Handlers.gs', newGetAll);
    console.log('Appended to end of file!');
  }
} else {
  console.log('Already exists!');
}
