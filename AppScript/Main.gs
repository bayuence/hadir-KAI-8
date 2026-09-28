// ============================================================
// ─── ENTRY POINT (WEB APP API) ───────────────────────────────
// ─── ENTRY POINT (WEB APP API) ───────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  var isLocked = false;
  try {
    var data   = JSON.parse(e.postData.contents || '{}');
    var action = data.action;
    var result;

    // Aksi yang mengubah/menulis data ke Google Sheets -> Butuh Lock antrean agar tidak bentrok
    var needsLock = [
      'checkIn', 'checkOut', 'daftar', 'ajukanIzin',
      'approveUser', 'rejectUser', 'approveIzin', 'rejectIzin',
      'savePenugasan', 'deletePenugasan', 'assignLokasi',
      'saveUserAdmin', 'deleteUserAdmin', 'toggleAdminRole',
      'selfAssignLokasi'
    ].indexOf(action) !== -1;

    if (needsLock) {
      isLocked = lock.tryLock(20000); // Maksimal tunggu antrean 20 detik
      if (!isLocked) {
        return respond({ 
          success: false, 
          message: 'Server sedang memproses antrean presensi lain. Aplikasi akan mencoba lagi otomatis...', 
          isQueueBusy: true 
        });
      }
    }

    switch (action) {
      case 'getPesertaList':    result = handleGetPesertaList(data);    break;
      case 'login':             result = handleLogin(data);             break;
      case 'daftar':            result = handleDaftar(data);            break;
      case 'getStatusHariIni':  result = handleGetStatusHariIni(data);  break;
      case 'checkIn':           result = handleCheckIn(data);           break;
      case 'checkOut':          result = handleCheckOut(data);          break;
      case 'getRiwayat':        result = handleGetRiwayat(data);        break;
      case 'getProfile':         result = handleGetProfile(data);        break;
      case 'ajukanIzin':        result = handleAjukanIzin(data);        break;
      case 'getIzinSaya':       result = handleGetIzinSaya(data);       break;
      case 'getDashboardAdmin': result = handleGetDashboardAdmin(data); break;
      case 'getRekapBulanan':   result = handleGetRekapBulanan(data);   break;
      case 'getPendingUsers':   result = handleGetPendingUsers(data);   break;
      case 'approveUser':       result = handleApproveUser(data);       break;
      case 'rejectUser':        result = handleRejectUser(data);        break;
      case 'getAllPresensi':    result = handleGetAllPresensi(data);    break;
      case 'getPendingIzin':    result = handleGetPendingIzin(data);    break;
      case 'approveIzin':       result = handleApproveIzin(data);       break;
      case 'rejectIzin':        result = handleRejectIzin(data);        break;
      case 'getPenugasan':      result = handleGetPenugasan(data);      break;
      case 'savePenugasan':     result = handleSavePenugasan(data);     break;
      case 'deletePenugasan':   result = handleDeletePenugasan(data);   break;
      case 'assignLokasi':         result = handleAssignLokasi(data);         break;
      case 'getPenugasanPublic':    result = handleGetPenugasanPublic(data);    break;
      case 'selfAssignLokasi':      result = handleSelfAssignLokasi(data);      break;
      case 'getAllUsersAdmin':       result = handleGetAllUsersAdmin(data);       break;
      case 'saveUserAdmin':          result = handleSaveUserAdmin(data);          break;
      case 'deleteUserAdmin':        result = handleDeleteUserAdmin(data);        break;
      case 'toggleAdminRole':        result = handleToggleAdminRole(data);        break;
      case 'broadcastPengingatWA':
        if (!isAdminValid(data.adminToken)) {
          result = { success: false, message: 'Token admin invalid.' };
        } else {
          var tipeBroadcast = data.tipe || 'masuk';
          if (tipeBroadcast === 'pulang') {
            result = kirimPengingatPresensiPulang(true);
          } else {
            result = kirimPengingatPresensiMasuk(true);
          }
        }
        break;
      default: result = { success: false, message: 'Action tidak dikenal' };
    }
    return respond(result);
  } catch (err) {
    return respond({ success: false, message: 'Server error: ' + err.message });
  } finally {
    if (isLocked) {
      try {
        SpreadsheetApp.flush(); // Pastikan perubahan tersimpan ke Google Sheets sebelum kunci dilepas
        lock.releaseLock();
      } catch (eLock) {}
    }
  }
}

function doGet(e) {
  if (e.parameter.action === 'getPesertaList') return respond(handleGetPesertaList({}));
  return respond({ success: false, message: 'Method tidak didukung' });
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

