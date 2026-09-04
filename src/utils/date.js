const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function formatTanggal() {
  const d = new Date()
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(isoStr) {
  if (!isoStr) return '--:--:--'
  // Jika formatnya sudah HH:MM:SS (dari Google Apps Script backend)
  if (typeof isoStr === 'string' && isoStr.includes(':') && isoStr.length <= 8) {
    return isoStr;
  }
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr; // Fallback jika gagal parse
  return d.toLocaleTimeString('id-ID', { hour12: false })
}

export function hitungDurasi(masuk, pulang) {
  if (!masuk || !pulang) return null

  // Helper: parse HH:MM:SS string atau Date object ke menit sejak tengah malam
  const toMenit = (val) => {
    if (!val) return null
    // Format HH:MM:SS dari backend (string pendek)
    if (typeof val === 'string' && val.includes(':') && val.length <= 8) {
      const [h, m] = val.split(':').map(Number)
      return h * 60 + m
    }
    // Fallback: coba parse sebagai Date
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes()
    return null
  }

  const menitMasuk = toMenit(masuk)
  const menitPulang = toMenit(pulang)
  if (menitMasuk === null || menitPulang === null) return null

  const diff = menitPulang - menitMasuk
  if (diff <= 0) return null
  const jam = Math.floor(diff / 60)
  const menit = diff % 60
  return `${jam}j ${menit}m`
}

