// FUNGSI AUTH & SESSION
// ============================================================

function isAdminValid(token) { return token === CONFIG.ADMIN_TOKEN; }

function validateSession(token) {
  if (!token) return null;
  var sheet = getOrCreateSheet('WEB Sessions');
  var data  = sheet.getDataRange().getDisplayValues();
  var now   = Date.now();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (now < Number(data[i][2])) return data[i][1];
      sheet.deleteRow(i + 1);
      return null;
    }
  }
  return null;
}

function createSession(idPeserta) {
  var token  = Utilities.getUuid();
  var expire = Date.now() + CONFIG.SESSION_EXPIRE;
  var sheet  = getOrCreateSheet('WEB Sessions');
  if (sheet.getLastRow() === 0) sheet.appendRow(['token', 'idPeserta', 'expired']);
  sheet.appendRow([token, idPeserta, expire]);
  return token;
}

// ============================================================
