/**
 * generateRekapPDF.js
 * ─────────────────────────────────────────────────────────────
 * Generator PDF "Rekap Kehadiran Magang"
 * PT. Kereta Api Indonesia (Persero) — Daop 8 Surabaya
 *
 * Format: A4 Landscape (297 × 210 mm)
 */

import { jsPDF }        from 'jspdf'
import { api }           from '../services/api'
import { extractDriveFileId } from '../utils/driveImage'
import { formatTglIndo, parseTanggal } from '../utils/dateFormat'

// ─── Layout (Landscape A4) ─────────────────────────────────────────────────
const PW  = 297
const PH  = 210
const ML  = 14
const MR  = 14
const CW  = PW - ML - MR  // 269 mm

// Palet
const NAVY   = [0,   73,  144]
const WHITE  = [255, 255, 255]
const BLACK  = [15,  15,  15]
const GREY   = [110, 110, 110]
const LGREY  = [210, 210, 210]
const BGROW  = [247, 248, 251]
const GREEN  = [22,  163,  74]
const AMBER  = [180, 120,   0]
const RED    = [185,  28,  28]

// ─── Load gambar ke base64 dengan multi-URL fallback ────────────────────────
// Mencoba 5 format URL Google Drive secara berurutan sampai ada yang berhasil.
async function loadImgB64(urlOrDriveId) {
  if (!urlOrDriveId) return null

  const fileId = extractDriveFileId(urlOrDriveId)

  const candidates = fileId
    ? [
        `https://lh3.googleusercontent.com/d/${fileId}=s400`,
        `https://lh3.googleusercontent.com/d/${fileId}=s200`,
        `https://lh3.googleusercontent.com/d/${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
      ]
    : [urlOrDriveId]

  for (const url of candidates) {
    const b64 = await tryLoadUrl(url)
    if (b64) return b64
  }
  return null
}

function tryLoadUrl(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => { img.src = ''; resolve(null) }, 8000)
    img.onload = () => {
      clearTimeout(timer)
      try {
        const c = document.createElement('canvas')
        c.width  = img.naturalWidth  || img.width  || 400
        c.height = img.naturalHeight || img.height || 400
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        const b64 = c.toDataURL('image/jpeg', 0.88)
        resolve(b64.length > 1000 ? b64 : null)
      } catch { resolve(null) }
    }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

// ─── Header halaman pertama ─────────────────────────────────────────────────
function drawHeader(doc, logoB64) {
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PW, 1.5, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('PT. KERETA API INDONESIA (Persero)', ML, 12)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Daerah Operasi 8 Surabaya \u2014 Unit Operasi', ML, 18)
  if (logoB64) {
    const logoW = 32, logoH = 14
    const logoX = PW - MR - logoW
    const logoY = 4
    doc.setFillColor(...WHITE)
    doc.rect(logoX - 1, logoY - 1, logoW + 2, logoH + 2, 'F')
    doc.addImage(logoB64, 'JPEG', logoX, logoY, logoW, logoH, '', 'FAST')
  }
  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.4)
  doc.line(ML, 23, PW - MR, 23)
}

// ─── Mini header halaman 2+ ─────────────────────────────────────────────────
function drawPageHeader(doc, nama) {
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PW, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('PT. KERETA API INDONESIA (Persero) \u2014 Daop 8 Surabaya', ML, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.setFontSize(7.5)
  doc.text('Rekap Kehadiran: ' + nama, ML, 14.5)
  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.3)
  doc.line(ML, 17, PW - MR, 17)
  return 21
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function drawFooters(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LGREY)
    doc.setLineWidth(0.3)
    doc.line(ML, PH - 11, PW - MR, PH - 11)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(
      'Halaman ' + p + ' dari ' + total + '  \u00B7  Sistem Presensi Digital \u2014 PT. Kereta Api Indonesia (Persero) Daop 8 Surabaya',
      PW / 2, PH - 6, { align: 'center' }
    )
  }
}

// ─── Header tabel ───────────────────────────────────────────────────────────
function drawTableHeader(doc, y, C) {
  const H = 8
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, H, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  for (const col of Object.values(C)) {
    doc.text(col.label, col.cx, y + 5.3, { align: 'center' })
  }
  return y + H
}

// ─── Warna status ────────────────────────────────────────────────────────────
function statusColor(status) {
  if (!status) return BLACK
  const s = status.toLowerCase()
  if (s === 'hadir') return GREEN
  if (s.startsWith('ijin')) return AMBER
  return RED
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNGSI UTAMA
// ═══════════════════════════════════════════════════════════════════════════
export async function generateRekapPDF({ user, token, riwayat, totalHari, totalJamStr }) {

  // 1. Profil terbaru
  let profile = user || {}
  try {
    const res = await api.getProfile(user.id, token)
    if (res.success && res.data) profile = { ...user, ...res.data }
  } catch (_) {}

  // 2. Load logo KAI
  const logoB64 = await loadImgB64('/logo-kai.png')

  // 3. Load foto profil
  let fotoProfilB64 = null
  if (profile.foto) {
    fotoProfilB64 = await loadImgB64(profile.foto)
  }

  // 4. Urutkan data terlama ke terbaru
  const sorted = riwayat.slice().sort((a, b) => {
    const da = parseTanggal(a.tanggal), db = parseTanggal(b.tanggal)
    return (!da || !db) ? 0 : da - db
  })

  // 5. Load SEMUA foto paralel — tunggu selesai semua sebelum generate PDF
  const cache = {}
  const urlsToLoad = new Set()
  for (const item of sorted) {
    if (item.fotoMasuk)  urlsToLoad.add(item.fotoMasuk)
    if (item.fotoPulang) urlsToLoad.add(item.fotoPulang)
  }
  await Promise.all([...urlsToLoad].map(async url => {
    cache[url] = await loadImgB64(url)
  }))

  // 6. Dokumen Landscape A4
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ══════════════════════════════════════════════════════════════════════════
  // HALAMAN 1 — HEADER + BIODATA
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(doc, logoB64)
  let y = 28

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('REKAP KEHADIRAN MAGANG', PW / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Peserta Magang di Unit Operasi \u2014 PT. Kereta Api Indonesia (Persero) Daop 8 Surabaya', PW / 2, y, { align: 'center' })
  y += 6
  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PW - MR, y)
  y += 6

  const FOTO_W    = 30
  const FOTO_H    = 40
  const BIO_RIGHT = ML + CW - FOTO_W - 6

  const bioRows = [
    ['Nama',             profile.nama    || '\u2014'],
    ['Alamat',           profile.alamat  || '\u2014'],
    ['No. HP',           profile.noHp    || '\u2014'],
    ['Email',            profile.email   || '\u2014'],
    ['Kampus / Sekolah', profile.kampus  || '\u2014'],
    ['Jurusan / Prodi',  profile.jurusan || '\u2014'],
    ['Mulai Magang',     profile.mulaiMagang   || '\u2014'],
    ['Selesai Magang',   profile.selesaiMagang || '\u2014'],
  ]

  const bioStartY = y
  doc.setFontSize(8.5)
  const LH      = 5.8
  const LABEL_W = 34

  for (const [label, val] of bioRows) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREY)
    doc.text(label, ML, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    const maxValW = BIO_RIGHT - ML - LABEL_W - 4
    const lines   = doc.splitTextToSize(': ' + val, maxValW)
    doc.text(lines[0], ML + LABEL_W, y)
    if (lines[1]) { y += LH - 0.5; doc.text(lines[1], ML + LABEL_W + 2, y) }
    y += LH
  }

  if (fotoProfilB64) {
    const fX = ML + CW - FOTO_W
    const fY = bioStartY - 2
    doc.setFillColor(...WHITE)
    doc.rect(fX - 0.5, fY - 0.5, FOTO_W + 1, FOTO_H + 1, 'F')
    doc.addImage(fotoProfilB64, 'JPEG', fX, fY, FOTO_W, FOTO_H, '', 'FAST')
    doc.setDrawColor(...LGREY)
    doc.setLineWidth(0.3)
    doc.rect(fX, fY, FOTO_W, FOTO_H, 'S')
  }

  y = Math.max(y, bioStartY + FOTO_H) + 5

  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PW - MR, y)
  y += 5

  const now      = new Date()
  const tglCetak = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Total Hadir :', ML, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text(totalHari + ' Hari', ML + 26, y)
  if (totalJamStr) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text('Total Jam :', ML + 65, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(totalJamStr, ML + 90, y)
  }
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Dicetak :', PW - MR - 60, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text(tglCetak, PW - MR - 38, y)
  y += 8

  // ══════════════════════════════════════════════════════════════════════════
  // TABEL KEHADIRAN
  // ══════════════════════════════════════════════════════════════════════════
  const colDefs = [
    { key: 'no',   label: 'NO',          w: 8  },
    { key: 'tgl',  label: 'TANGGAL',     w: 40 },
    { key: 'lok',  label: 'LOKASI',      w: 38 },
    { key: 'jm',   label: 'JAM MASUK',   w: 22 },
    { key: 'fm',   label: 'FOTO MASUK',  w: 47 },
    { key: 'jp',   label: 'JAM PULANG',  w: 22 },
    { key: 'fp',   label: 'FOTO PULANG', w: 47 },
    { key: 'tot',  label: 'TOTAL',       w: 21 },
    { key: 'stat', label: 'STATUS',      w: 24 },
  ]
  const sumW = colDefs.reduce((s, c) => s + c.w, 0)
  if (sumW !== CW) {
    const diff = CW - sumW
    colDefs[4].w += Math.floor(diff / 2)
    colDefs[6].w += diff - Math.floor(diff / 2)
  }

  let xAcc = ML
  const C = {}
  for (const col of colDefs) {
    C[col.key] = { x: xAcc, w: col.w, cx: xAcc + col.w / 2, label: col.label }
    xAcc += col.w
  }

  y = drawTableHeader(doc, y, C)

  const FOTO_ROW_H = 34
  const TEXT_ROW_H = 10
  doc.setLineWidth(0.2)

  sorted.forEach((item, i) => {
    // Tinggi baris berdasarkan foto yang BENAR-BENAR berhasil dimuat (bukan cuma ada URL)
    const imgMasuk  = item.fotoMasuk  ? cache[item.fotoMasuk]  : null
    const imgPulang = item.fotoPulang ? cache[item.fotoPulang] : null
    const hasFoto   = !!(imgMasuk || imgPulang)
    const rowH      = hasFoto ? FOTO_ROW_H : TEXT_ROW_H

    if (y + rowH > PH - 18) {
      drawFooters(doc)
      doc.addPage()
      y = drawPageHeader(doc, profile.nama || '')
      y = drawTableHeader(doc, y, C)
    }

    if (i % 2 === 0) {
      doc.setFillColor(...BGROW)
      doc.rect(ML, y, CW, rowH, 'F')
    }

    doc.setDrawColor(...LGREY)
    doc.rect(ML, y, CW, rowH, 'S')
    for (const col of Object.values(C)) {
      if (col.x > ML) doc.line(col.x, y, col.x, y + rowH)
    }

    const midY = y + rowH / 2 + 2.5
    const topY = hasFoto ? y + 5 : y + 3.5

    // No
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(String(i + 1), C.no.cx, midY, { align: 'center' })

    // Tanggal
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BLACK)
    const tglLines = doc.splitTextToSize(formatTglIndo(item.tanggal), C.tgl.w - 3)
    doc.text(tglLines[0], C.tgl.x + 2, topY)
    if (tglLines[1]) doc.text(tglLines[1], C.tgl.x + 2, topY + 3.8)

    // Lokasi
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(50, 50, 50)
    const lokLines = doc.splitTextToSize((item.lokasi || 'Kantor Daop').toUpperCase(), C.lok.w - 4)
    doc.text(lokLines[0], C.lok.x + 2, topY)
    if (lokLines[1]) doc.text(lokLines[1], C.lok.x + 2, topY + 3.8)

    // Jam Masuk (untuk ijin = jam lapor ijin)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)
    doc.text(item.jamMasuk || '\u2014', C.jm.cx, midY, { align: 'center' })

    // Foto Masuk (untuk ijin = foto bukti ijin)
    const fImgY = y + 2
    if (hasFoto) {
      const fmX = C.fm.x + 2, fmW = C.fm.w - 4, fmH = rowH - 4
      if (imgMasuk) {
        doc.addImage(imgMasuk, 'JPEG', fmX, fImgY, fmW, fmH, '', 'FAST')
        doc.setDrawColor(...LGREY); doc.rect(fmX, fImgY, fmW, fmH, 'S')
      } else {
        doc.setFillColor(238, 238, 238)
        doc.rect(C.fm.x, y, C.fm.w, rowH, 'F')
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
        doc.text('\u2014', C.fm.cx, midY, { align: 'center' })
      }
    } else {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text('\u2014', C.fm.cx, midY, { align: 'center' })
    }

    // Jam Pulang
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)
    doc.text(item.jamPulang || '\u2014', C.jp.cx, midY, { align: 'center' })

    // Foto Pulang
    if (hasFoto) {
      const fpX = C.fp.x + 2, fpW = C.fp.w - 4, fpH = rowH - 4
      if (imgPulang) {
        doc.addImage(imgPulang, 'JPEG', fpX, fImgY, fpW, fpH, '', 'FAST')
        doc.setDrawColor(...LGREY); doc.rect(fpX, fImgY, fpW, fpH, 'S')
      } else {
        doc.setFillColor(238, 238, 238)
        doc.rect(C.fp.x, y, C.fp.w, rowH, 'F')
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
        doc.text('\u2014', C.fp.cx, midY, { align: 'center' })
      }
    } else {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text('\u2014', C.fp.cx, midY, { align: 'center' })
    }

    // Total Jam
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(item.totalJam || '\u2014', C.tot.cx, midY, { align: 'center' })

    // Status — hijau/kuning/merah
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...statusColor(item.status))
    doc.text(item.status || '\u2014', C.stat.cx, midY, { align: 'center' })

    y += rowH
  })

  y += 5
  if (y > PH - 22) { doc.addPage(); y = drawPageHeader(doc, profile.nama || '') + 5 }
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...GREY)
  doc.text(
    '* FOTO MASUK untuk entri Ijin = foto bukti/dokumentasi ijin. Dokumen ini diterbitkan oleh Sistem Presensi Digital PT. KAI (Persero) Daop 8 Surabaya.',
    ML, y
  )

  drawFooters(doc)

  const safeName = (profile.nama || 'Peserta').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  doc.save('REKAP KEHADIRAN ' + safeName + '.pdf')
}
