const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function formatTanggal() {
  const d = new Date()
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Parse nilai waktu dari backend Google Apps Script.
 * GAS sering mengirim waktu sebagai ISO string dengan epoch 1899-12-30
 * (Google Sheets Serial Date). Fungsi ini mendeteksi dan mengkonversinya.
 */
function parseWaktu(val) {
  if (!val) return null

  if (typeof val === 'string') {
    const trimmed = val.trim()

    // Format HH:MM atau HH:MM:SS langsung
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(':').map(Number)
      return { h: parts[0], m: parts[1], s: parts[2] || 0 }
    }

    // ISO string — deteksi Google Sheets Serial Date (tahun 1899/1900)
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() <= 1900) {
        // GAS menyimpan waktu lokal (WIB) sebagai UTC dalam ISO, pakai getHours() agar
        // browser otomatis konversi UTC → local time (WIB +7)
        return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
      }
      // ISO normal (tahun wajar) → ambil local time
      return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
    }
  }

  if (typeof val === 'number') {
    const ms = val < 1e10 ? val * 1000 : val
    const d = new Date(ms)
    if (!isNaN(d.getTime())) {
      return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
    }
  }

  return null
}

export function formatTime(val) {
  if (!val) return '--:--:--'
  const t = parseWaktu(val)
  if (!t) return typeof val === 'string' ? val : '--:--:--'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`
}

export function hitungDurasi(masuk, pulang) {
  if (!masuk || !pulang) return null

  const tMasuk  = parseWaktu(masuk)
  const tPulang = parseWaktu(pulang)
  if (!tMasuk || !tPulang) return null

  const menitMasuk  = tMasuk.h  * 60 + tMasuk.m
  const menitPulang = tPulang.h * 60 + tPulang.m

  const diff = menitPulang - menitMasuk
  if (diff <= 0) return null
  const jam   = Math.floor(diff / 60)
  const menit = diff % 60
  return `${jam}j ${menit}m`
}
