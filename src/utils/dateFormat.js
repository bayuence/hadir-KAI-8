/**
 * dateFormat.js
 * ─────────────────────────────────────────────────────────────
 * Utilitas format & parse tanggal untuk sistem presensi KAI.
 *
 * Mendukung dua format input:
 *  - "DD/MM/YYYY"  (web app, zero-padded)
 *  - "M/D/YYYY"    (Google Sheets locale AS)
 */

/**
 * Normalisasi string tanggal ke objek { day, month, year }.
 * @param {string} tglStr
 * @returns {{ day: number, month: number, year: number } | null}
 */
export function normalizeTglParts(tglStr) {
  if (!tglStr) return null
  const parts = tglStr.split('/')
  if (parts.length !== 3) return null

  const [p0, p1, p2] = parts
  const n0 = parseInt(p0), n1 = parseInt(p1), n2 = parseInt(p2)
  let day, month, year

  if (n0 > 12) {
    // Pasti DD/MM/YYYY
    day = n0; month = n1; year = n2
  } else if (n1 > 12) {
    // Pasti M/D/YYYY (format AS)
    month = n0; day = n1; year = n2
  } else if (p0.length === 2 && p0[0] === '0') {
    // Zero-padded "01/…" → DD/MM/YYYY
    day = n0; month = n1; year = n2
  } else if (p1.length === 2 && p1[0] === '0') {
    day = n0; month = n1; year = n2
  } else {
    // Ambiguous → asumsi M/D/YYYY (data Google Form lama tidak zero-padded)
    month = n0; day = n1; year = n2
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month, year }
}

/**
 * Format string tanggal ke format Indonesia pendek: "Kamis, 17 September"
 * @param {string} tglStr
 * @returns {string}
 */
export function formatTglIndo(tglStr) {
  const p = normalizeTglParts(tglStr)
  if (!p) return tglStr || ''
  const d = new Date(p.year, p.month - 1, p.day)
  if (isNaN(d.getTime())) return tglStr

  const hari  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]}`
}

/**
 * Format string tanggal ke format Indonesia lengkap: "Kamis, 17 September 2026"
 * @param {string} tglStr
 * @returns {string}
 */
export function formatTglIndoFull(tglStr) {
  const p = normalizeTglParts(tglStr)
  if (!p) return tglStr || ''
  const d = new Date(p.year, p.month - 1, p.day)
  if (isNaN(d.getTime())) return tglStr

  const hari  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${p.year}`
}

/**
 * Parse string tanggal ke Date object.
 * @param {string} tglStr
 * @returns {Date | null}
 */
export function parseTanggal(tglStr) {
  const p = normalizeTglParts(tglStr)
  if (!p) return null
  const d = new Date(p.year, p.month - 1, p.day)
  return isNaN(d.getTime()) ? null : d
}
