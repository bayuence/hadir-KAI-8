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
  const diff = Math.floor((new Date(pulang) - new Date(masuk)) / 1000 / 60)
  const jam = Math.floor(diff / 60)
  const menit = diff % 60
  return `${jam}j ${menit}m`
}
