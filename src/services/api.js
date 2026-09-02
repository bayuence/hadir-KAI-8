const GAS_URL = import.meta.env.VITE_GAS_URL
const ADMIN_TOKEN = 'KAI_DAOP8_ADMIN_2026'

async function fetchGAS(payload) {
  if (!GAS_URL) return { success: false, message: 'URL API belum dikonfigurasi' }
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    })
    return await res.json()
  } catch (error) {
    console.error('API Error:', error)
    return { success: false, message: 'Gagal menghubungi server' }
  }
}

export const api = {
  // ─── AUTH ─────────────────────────────────────────────────
  getPesertaList: () => fetchGAS({ action: 'getPesertaList' }),

  login: (nama, tanggalLahir) => fetchGAS({ action: 'login', nama, tanggalLahir }),

  daftar: (payload) => fetchGAS({ action: 'daftar', ...payload }),

  // ─── PRESENSI ─────────────────────────────────────────────
  getStatusHariIni: (idPeserta, token) =>
    fetchGAS({ action: 'getStatusHariIni', idPeserta, token }),

  checkIn: (payload) => fetchGAS({ action: 'checkIn', ...payload }),

  checkOut: (payload) => fetchGAS({ action: 'checkOut', ...payload }),

  getRiwayat: (idPeserta, token) =>
    fetchGAS({ action: 'getRiwayat', idPeserta, token }),

  getProfile: (idPeserta, token) =>
    fetchGAS({ action: 'getProfile', idPeserta, token }),

  // ─── IZIN ─────────────────────────────────────────────────
  ajukanIzin: (payload) => fetchGAS({ action: 'ajukanIzin', ...payload }),

  getIzinSaya: (idPeserta, token) =>
    fetchGAS({ action: 'getIzinSaya', idPeserta, token }),

  // ─── ADMIN ────────────────────────────────────────────────
  admin: {
    getDashboard: () =>
      fetchGAS({ action: 'getDashboardAdmin', adminToken: ADMIN_TOKEN }),

    getPendingUsers: () =>
      fetchGAS({ action: 'getPendingUsers', adminToken: ADMIN_TOKEN }),

    approveUser: (idPeserta, idLokasi) =>
      fetchGAS({ action: 'approveUser', idPeserta, idLokasi, adminToken: ADMIN_TOKEN }),

    rejectUser: (idPeserta) =>
      fetchGAS({ action: 'rejectUser', idPeserta, adminToken: ADMIN_TOKEN }),

    getAllPresensi: (tanggal) =>
      fetchGAS({ action: 'getAllPresensi', tanggal, adminToken: ADMIN_TOKEN }),

    getPendingIzin: () =>
      fetchGAS({ action: 'getPendingIzin', adminToken: ADMIN_TOKEN }),

    approveIzin: (idIzin) =>
      fetchGAS({ action: 'approveIzin', idIzin, adminToken: ADMIN_TOKEN }),

    rejectIzin: (idIzin) =>
      fetchGAS({ action: 'rejectIzin', idIzin, adminToken: ADMIN_TOKEN }),

    getPenugasan: () =>
      fetchGAS({ action: 'getPenugasan', adminToken: ADMIN_TOKEN }),

    savePenugasan: (payload) =>
      fetchGAS({ action: 'savePenugasan', ...payload, adminToken: ADMIN_TOKEN }),

    deletePenugasan: (id) =>
      fetchGAS({ action: 'deletePenugasan', id, adminToken: ADMIN_TOKEN }),

    assignLokasi: (idPeserta, idLokasi) =>
      fetchGAS({ action: 'assignLokasi', idPeserta, idLokasi, adminToken: ADMIN_TOKEN }),
  }
}
