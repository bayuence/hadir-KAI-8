const GAS_URL = import.meta.env.VITE_GAS_URL
const ADMIN_TOKEN = 'KAI_DAOP8_ADMIN_2026'

// Timeout default: 20 detik — cukup untuk GAS cold start, tidak bikin freeze
const DEFAULT_TIMEOUT_MS = 20_000
const MAX_RETRIES = 3

// Helper delay dengan random jitter (mencegah Thundering Herd Problem)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchGAS(payload, timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES) {
  if (!GAS_URL) return { success: false, message: 'URL API belum dikonfigurasi' }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timer)

      const data = await res.json()

      // Jika server mengembalikan isQueueBusy / antrean, coba lagi otomatis secara silent
      if (data && data.isQueueBusy && attempt < retries) {
        console.warn(`[GAS Queue] Attempt ${attempt} busy for action: ${payload.action}, retrying...`)
        const jitter = Math.floor(Math.random() * 1500) + 1000 // Jeda acak 1.0 - 2.5 detik
        await delay(jitter)
        continue
      }

      return data
    } catch (error) {
      clearTimeout(timer)

      // Jika terjadi timeout atau gangguan jaringan, lakukan retry otomatis di background
      if (attempt < retries) {
        console.warn(`[GAS Fetch] Attempt ${attempt} failed (${error.name || error.message}) for action: ${payload.action}. Retrying...`)
        const backoffJitter = (attempt * 1500) + Math.floor(Math.random() * 1000) // 1.5s, 3.0s + jitter
        await delay(backoffJitter)
        continue
      }

      if (error.name === 'AbortError') {
        console.warn('GAS request timed out after retries:', payload.action)
        return {
          success: false,
          message: 'Server sedang antre memproses presensi. Silakan coba tekan tombol sekali lagi.',
          timeout: true,
        }
      }

      console.error('API Error:', error)
      return { success: false, message: 'Gagal menghubungi server. Periksa koneksi internet.' }
    }
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

  // ─── LOKASI PENUGASAN (PESERTA) ───────────────────────────
  // Ambil daftar unit kerja & lokasi yang bisa dipilih peserta (publik, tanpa token)
  getPenugasanPublic: () =>
    fetchGAS({ action: 'getPenugasanPublic' }),

  // Peserta pindah ke lokasi penugasan lain secara mandiri
  selfAssignLokasi: (idLokasi, token) =>
    fetchGAS({ action: 'selfAssignLokasi', idLokasi, token }),

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

    getAllUsers: () =>
      fetchGAS({ action: 'getAllUsersAdmin', adminToken: ADMIN_TOKEN }),
      
    saveUser: (payload) =>
      fetchGAS({ action: 'saveUserAdmin', ...payload, adminToken: ADMIN_TOKEN }),
      
    deleteUser: (idPeserta) =>
      fetchGAS({ action: 'deleteUserAdmin', idPeserta, adminToken: ADMIN_TOKEN }),
      
    toggleAdminRole: (idPeserta, role) =>
      fetchGAS({ action: 'toggleAdminRole', idPeserta, role, adminToken: ADMIN_TOKEN }),

    broadcastPengingatWA: (tipe = 'masuk') =>
      fetchGAS({ action: 'broadcastPengingatWA', tipe, adminToken: ADMIN_TOKEN }),
  }
}
