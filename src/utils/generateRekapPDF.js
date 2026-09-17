/**
 * generateRekapPDF.js
 * ─────────────────────────────────────────────────────────────
 * Generator PDF "Rekap Kehadiran Magang"
 * PT. Kereta Api Indonesia (Persero) — Daop 8 Surabaya
 *
 * Format: A4 Landscape (297 × 210 mm) — agar tabel cukup lebar
 */

import { jsPDF }        from 'jspdf'
import { api }           from '../services/api'
import { driveImageUrl } from '../utils/driveImage'
import { formatTglIndo, parseTanggal } from '../utils/dateFormat'

// ─── Layout (Landscape A4) ─────────────────────────────────────────────────
const PW  = 297          // lebar  mm (landscape)
const PH  = 210          // tinggi mm
const ML  = 14
const MR  = 14
const CW  = PW - ML - MR  // 269 mm konten

// Palet — hitam & abu, sesedikit mungkin warna
const NAVY   = [0,   73,  144]
const WHITE  = [255, 255, 255]
const BLACK  = [15,  15,  15]
const GREY   = [110, 110, 110]
const LGREY  = [210, 210, 210]
const BGROW  = [247, 248, 251]   // baris genap — abu sangat muda

// ─── Helper: load URL → base64 ────────────────────────────────────────────
function loadImgB64(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width  = img.naturalWidth  || img.width
        c.height = img.naturalHeight || img.height
        const ctx = c.getContext('2d')
        // Isi background putih agar tidak ada hitam transparan
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        resolve(c.toDataURL('image/jpeg', 0.9))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Header halaman pertama ─────────────────────────────────────────────────
// Nama perusahaan KIRI (bold hitam), Logo KAI KANAN
function drawHeader(doc, logoB64) {
  // Garis aksen atas
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PW, 1.5, 'F')

  // Nama perusahaan — kiri, bold hitam besar
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('PT. KERETA API INDONESIA (Persero)', ML, 12)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Daerah Operasi 8 Surabaya — Unit Operasi', ML, 18)

  // Logo KAI — kanan
  if (logoB64) {
    // Kotak putih sebagai background agar tidak ada artefak
    const logoW = 32, logoH = 14
    const logoX = PW - MR - logoW
    const logoY = 4
    doc.setFillColor(...WHITE)
    doc.rect(logoX - 1, logoY - 1, logoW + 2, logoH + 2, 'F')
    doc.addImage(logoB64, 'JPEG', logoX, logoY, logoW, logoH, '', 'FAST')
  }

  // Garis bawah header
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
  doc.text('PT. KERETA API INDONESIA (Persero) — Daop 8 Surabaya', ML, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.setFontSize(7.5)
  doc.text(`Rekap Kehadiran: ${nama}`, ML, 14.5)
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
      `Halaman ${p} dari ${total}  ·  Sistem Presensi Digital — PT. Kereta Api Indonesia (Persero) Daop 8 Surabaya`,
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
  for (const [, col] of Object.entries(C)) {
    doc.text(col.label, col.cx, y + 5.3, { align: 'center' })
  }
  return y + H
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

  // 2. Load logo KAI dari /public
  const logoB64 = await loadImgB64('/logo-kai.png')

  // 3. Load foto profil
  let fotoProfilB64 = null
  if (profile.foto) {
    fotoProfilB64 = await loadImgB64(driveImageUrl(profile.foto, 300))
  }

  // 4. Urutkan & load foto kehadiran
  const sorted = riwayat.slice().sort((a, b) => {
    const da = parseTanggal(a.tanggal), db = parseTanggal(b.tanggal)
    return (!da || !db) ? 0 : da - db
  })

  const cache = {}
  await Promise.all(sorted.flatMap(item => {
    const jobs = []
    if (item.fotoMasuk && !cache[item.fotoMasuk])
      jobs.push(loadImgB64(driveImageUrl(item.fotoMasuk, 150))
        .then(b => { cache[item.fotoMasuk] = b }))
    if (item.fotoPulang && !cache[item.fotoPulang])
      jobs.push(loadImgB64(driveImageUrl(item.fotoPulang, 150))
        .then(b => { cache[item.fotoPulang] = b }))
    return jobs
  }))

  // 5. Dokumen Landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ══════════════════════════════════════════════════════════════════════════
  // HALAMAN 1 — HEADER + BIODATA
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(doc, logoB64)

  let y = 28

  // ── Judul ─────────────────────────────────────────────────────────────────
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('REKAP KEHADIRAN MAGANG', PW / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Peserta Magang di Unit Operasi — PT. Kereta Api Indonesia (Persero) Daop 8 Surabaya', PW / 2, y, { align: 'center' })
  y += 6

  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PW - MR, y)
  y += 6

  // ── Biodata (kiri) + Foto profil (kanan) ──────────────────────────────────
  const FOTO_W    = 30
  const FOTO_H    = 40
  const BIO_RIGHT = ML + CW - FOTO_W - 6   // batas kanan area biodata

  const bioRows = [
    ['Nama',             profile.nama    || '—'],
    ['Alamat',           profile.alamat  || '—'],
    ['No. HP',           profile.noHp    || '—'],
    ['Email',            profile.email   || '—'],
    ['Kampus / Sekolah', profile.kampus  || '—'],
    ['Jurusan / Prodi',  profile.jurusan || '—'],
    ['Mulai Magang',     profile.mulaiMagang   || '—'],
    ['Selesai Magang',   profile.selesaiMagang  || '—'],
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
    const lines   = doc.splitTextToSize(`: ${val}`, maxValW)
    doc.text(lines[0], ML + LABEL_W, y)
    if (lines[1]) { y += LH - 0.5; doc.text(lines[1], ML + LABEL_W + 2, y) }
    y += LH
  }

  // Foto profil
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

  // ── Statistik — satu baris teks bersih ────────────────────────────────────
  doc.setDrawColor(...LGREY)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PW - MR, y)
  y += 5

  const now      = new Date()
  const tglCetak = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  doc.setFontSize(8.5)

  // Total Hadir
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Total Hadir :', ML, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text(`${totalHari} Hari`, ML + 26, y)

  // Total Jam
  if (totalJamStr) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text('Total Jam :', ML + 65, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(totalJamStr, ML + 90, y)
  }

  // Dicetak
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Dicetak :', PW - MR - 60, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text(tglCetak, PW - MR - 38, y)

  y += 8

  // ══════════════════════════════════════════════════════════════════════════
  // TABEL KEHADIRAN
  // ══════════════════════════════════════════════════════════════════════════

  // Kolom — total harus = CW = 269 mm
  // No(8) | Tgl(38) | Lok(36) | JM(20) | FM(40) | JP(20) | FP(40) | Tot(14) | Stat(13) = 229 → sesuaikan
  // Hitung ulang agar pas 269
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
  // Verifikasi total
  const sumW = colDefs.reduce((s, c) => s + c.w, 0)  // harus = CW
  if (sumW !== CW) {
    // Distribusikan sisa ke kolom terbesar
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

  const FOTO_ROW_H = 32
  const TEXT_ROW_H = 10   // cukup untuk 2 baris teks
  doc.setLineWidth(0.2)

  sorted.forEach((item, i) => {
    const hasFoto = !!(item.fotoMasuk || item.fotoPulang)
    const rowH    = hasFoto ? FOTO_ROW_H : TEXT_ROW_H

    if (y + rowH > PH - 18) {
      drawFooters(doc)
      doc.addPage()
      y = drawPageHeader(doc, profile.nama || '')
      y = drawTableHeader(doc, y, C)
    }

    // Latar baris — hanya striped sederhana, semua sama
    if (i % 2 === 0) {
      doc.setFillColor(...BGROW)
      doc.rect(ML, y, CW, rowH, 'F')
    }

    // Border baris
    doc.setDrawColor(...LGREY)
    doc.rect(ML, y, CW, rowH, 'S')

    // Garis kolom vertikal
    for (const col of Object.values(C)) {
      if (col.x > ML) {
        doc.setDrawColor(...LGREY)
        doc.line(col.x, y, col.x, y + rowH)
      }
    }

    const midY = y + rowH / 2 + 2.5
    const topY = hasFoto ? y + 5 : y + 3.5

    // — No
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(String(i + 1), C.no.cx, midY, { align: 'center' })

    // — Tanggal
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BLACK)
    const tglLines = doc.splitTextToSize(formatTglIndo(item.tanggal), C.tgl.w - 3)
    doc.text(tglLines[0], C.tgl.x + 2, topY)
    if (tglLines[1]) doc.text(tglLines[1], C.tgl.x + 2, topY + 3.8)

    // — Lokasi
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(50, 50, 50)
    const lokRaw   = (item.lokasi || 'Kantor Daop').toUpperCase()
    const lokLines = doc.splitTextToSize(lokRaw, C.lok.w - 4)
    // Maksimal 2 baris agar tidak overflow ke baris berikutnya
    doc.text(lokLines[0], C.lok.x + 2, topY)
    if (lokLines[1]) doc.text(lokLines[1], C.lok.x + 2, topY + 3.8)

    // — Jam Masuk
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)
    doc.text(item.jamMasuk || '—', C.jm.cx, midY, { align: 'center' })

    // — Foto Masuk
    if (hasFoto) {
      const fX = C.fm.x + 2, fY = y + 2
      const fW = C.fm.w - 4, fH = rowH - 4
      if (item.fotoMasuk && cache[item.fotoMasuk]) {
        doc.addImage(cache[item.fotoMasuk], 'JPEG', fX, fY, fW, fH, '', 'FAST')
        doc.setDrawColor(...LGREY); doc.rect(fX, fY, fW, fH, 'S')
      } else {
        doc.setFillColor(238, 238, 238)
        doc.rect(C.fm.x, y, C.fm.w, rowH, 'F')
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
        doc.text('—', C.fm.cx, midY, { align: 'center' })
      }
    } else {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text('—', C.fm.cx, midY, { align: 'center' })
    }

    // — Jam Pulang
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)
    doc.text(item.jamPulang || '—', C.jp.cx, midY, { align: 'center' })

    // — Foto Pulang
    if (hasFoto) {
      const fX = C.fp.x + 2, fY = y + 2
      const fW = C.fp.w - 4, fH = rowH - 4
      if (item.fotoPulang && cache[item.fotoPulang]) {
        doc.addImage(cache[item.fotoPulang], 'JPEG', fX, fY, fW, fH, '', 'FAST')
        doc.setDrawColor(...LGREY); doc.rect(fX, fY, fW, fH, 'S')
      } else {
        doc.setFillColor(238, 238, 238)
        doc.rect(C.fp.x, y, C.fp.w, rowH, 'F')
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
        doc.text('—', C.fp.cx, midY, { align: 'center' })
      }
    } else {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text('—', C.fp.cx, midY, { align: 'center' })
    }

    // — Total Jam
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(item.totalJam || '—', C.tot.cx, midY, { align: 'center' })

    // — Status
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(item.status || '—', C.stat.cx, midY, { align: 'center' })

    y += rowH
  })

  // Catatan kecil bawah tabel
  y += 5
  if (y > PH - 22) { doc.addPage(); y = drawPageHeader(doc, profile.nama || '') + 5 }
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...GREY)
  doc.text('Dokumen ini diterbitkan oleh Sistem Presensi Digital PT. KAI (Persero) Daop 8 Surabaya.', ML, y)

  drawFooters(doc)

  const safeName = (profile.nama || 'Peserta').trim()
  doc.save(`REKAP KEHADIRAN ${safeName}.pdf`)
}
