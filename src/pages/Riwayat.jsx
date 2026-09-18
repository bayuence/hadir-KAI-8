/**
 * Riwayat.jsx
 * ─────────────────────────────────────────────────────────────
 * Halaman Riwayat Presensi peserta magang KAI Daop 8.
 * Menampilkan daftar kehadiran dengan filter bulan & status,
 * serta tombol download PDF rekap (lihat: utils/generateRekapPDF.js).
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../context/AuthContext'
import { api }         from '../services/api'
import BottomNav       from '../components/BottomNav'
import { driveThumbUrl }     from '../utils/driveImage'
import { formatTglIndo, parseTanggal } from '../utils/dateFormat'
import { generateRekapPDF }  from '../utils/generateRekapPDF'
import './Riwayat.css'

// ─── Komponen Utama ────────────────────────────────────────────────────────
export default function Riwayat() {
  const navigate = useNavigate()
  const { user, token } = useAuth()

  const [riwayat,      setRiwayat]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [bulanFilter,  setBulanFilter]  = useState('Semua')
  const [statusFilter, setStatusFilter] = useState('Semua Status')
  const [pdfLoading,   setPdfLoading]   = useState(false)

  // ── Fetch data riwayat ───────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    if (!user?.id || !token) { navigate('/login'); return }

    api.getRiwayat(user.id, token)
      .then(res => {
        if (!isMounted) return
        if (res.success) {
          setRiwayat(res.data || [])

        } else {
          if (res.message?.includes('Sesi')) navigate('/login')
          else setError(res.message || 'Gagal memuat riwayat')
        }
      })
      .catch(() => {
        if (!isMounted) return
        setError('Tidak dapat terhubung ke server')
      })
      .finally(() => { if (isMounted) setLoading(false) })

    return () => { isMounted = false }
  }, [user?.id, token])

  // ── Filter tampilan ──────────────────────────────────────────────────────
  const bulanMap = {
    'Juli': 6, 'Agustus': 7, 'September': 8,
    'Oktober': 9, 'November': 10, 'Desember': 11,
  }

  const filtered = riwayat.filter(item => {
    const isIjin = item.status && item.status.toLowerCase().startsWith('ijin')
    const matchStatus =
      statusFilter === 'Semua Status' ||
      item.status === statusFilter ||
      (statusFilter === 'Izin' && isIjin) // 'Izin' filter cocokkan semua varian ijin
    if (bulanFilter === 'Semua') return matchStatus
    const d = parseTanggal(item.tanggal)
    if (!d) return false
    return matchStatus && d.getMonth() === bulanMap[bulanFilter]
  })

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalHari = riwayat.filter(i => i.status === 'Hadir').length

  const totalDetik = riwayat.reduce((acc, item) => {
    if (item.status !== 'Hadir') return acc
    if (item.jamMasuk && item.jamPulang) {
      const parseSec = (t) => {
        const parts = String(t).trim().split(':')
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10) || 0
          const m = parseInt(parts[1], 10) || 0
          const s = parseInt(parts[2], 10) || 0
          return h * 3600 + m * 60 + s
        }
        return null
      }
      const s1 = parseSec(item.jamMasuk)
      const s2 = parseSec(item.jamPulang)
      if (s1 !== null && s2 !== null && s2 >= s1) {
        return acc + (s2 - s1)
      }
    }
    if (item.totalJam) {
      const m = item.totalJam.match(/(\d+)j\s*(\d+)m/)
      if (m) return acc + (parseInt(m[1], 10) * 3600) + (parseInt(m[2], 10) * 60)
    }
    return acc
  }, 0)

  const totalJamStr = totalDetik > 0
    ? `${Math.floor(totalDetik / 3600)}j ${Math.floor((totalDetik % 3600) / 60)}m`
    : ''

  const totalTimeDetailStr = totalDetik > 0
    ? `${Math.floor(totalDetik / 3600)} Jam ${Math.floor((totalDetik % 3600) / 60)} Menit ${totalDetik % 60} Detik`
    : '0 Jam 0 Menit 0 Detik'

  // ── Handler download PDF ─────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      await generateRekapPDF({ user, token, riwayat, totalHari, totalJamStr })
    } catch (err) {
      console.error('PDF error:', err)
      alert('Gagal membuat PDF. Silakan coba lagi.')
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── Header ── */}
      <div className="page-header">
        <h1>Riwayat Presensi</h1>
        <button
          id="btn-download-pdf"
          className="btn-download-pdf"
          onClick={handleDownloadPDF}
          disabled={pdfLoading || loading || riwayat.length === 0}
          title="Download Data Sheet PDF"
        >
          {pdfLoading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" className="spin">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M12 15V3m0 12-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" strokeLinecap="round"/>
            </svg>
          )}
          <span>{pdfLoading ? 'Membuat...' : 'PDF'}</span>
        </button>
      </div>

      <div className="riwayat-wrap">

        {/* ── Ringkasan Kehadiran (Di Atas Filter) ── */}
        {!loading && !error && riwayat.length > 0 && (
          <div className="riwayat-summary-card animate-fade-in">
            <div className="rsc-item">
              <span className="rsc-label">Total Hadir</span>
              <span className="rsc-val">{totalHari} Hari</span>
            </div>
            <div className="rsc-divider" />
            <div className="rsc-item">
              <span className="rsc-label">Total Waktu Kerja</span>
              <span className="rsc-val">{totalTimeDetailStr}</span>
            </div>
          </div>
        )}

        {/* ── Filter ── */}
        <div className="filter-row animate-fade-in">
          <select
            className="filter-select"
            value={bulanFilter}
            onChange={e => setBulanFilter(e.target.value)}
          >
            <option value="Semua">Semua Bulan</option>
            <option value="Juli">Juli 2026</option>
            <option value="Agustus">Agustus 2026</option>
            <option value="September">September 2026</option>
            <option value="Oktober">Oktober 2026</option>
            <option value="November">November 2026</option>
            <option value="Desember">Desember 2026</option>
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="Semua Status">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Alfa">Alfa</option>
          </select>
        </div>

        {/* ── Daftar Riwayat ── */}
        <div className="riwayat-list animate-fade-up">
          {loading ? (
            <div className="text-center text-grey text-sm mt-8">Memuat riwayat...</div>
          ) : error ? (
            <div className="text-center text-grey text-sm mt-8">⚠️ {error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-grey text-sm mt-8">
              {riwayat.length === 0
                ? 'Belum ada riwayat presensi'
                : 'Tidak ada data untuk filter ini'}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div key={idx} className="riwayat-card">
                <div className="rc-header">
                  <div>
                    <p className="rc-date">{formatTglIndo(item.tanggal)}</p>
                    <p className="rc-loc">{item.lokasi || 'Kantor Daop'}</p>
                  </div>
                  <span className={`badge ${
                    item.status === 'Hadir' ? 'badge-green'
                    : (item.status && item.status.toLowerCase().startsWith('ijin')) ? 'badge-amber'
                    : 'badge-red'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="rc-body">
                  <div className="rc-times">
                    {/* Jam Masuk */}
                    <div className="rc-time-row">
                      <div className="rc-dot dot-green"/>
                      <span className="rc-time-text">
                        {item.jamMasuk
                          ? <strong>{item.jamMasuk}</strong>
                          : <span style={{ color: '#9ca3af' }}>--:--</span>
                        } Masuk
                      </span>
                      {item.fotoMasuk && (
                        <img
                          src={driveThumbUrl(item.fotoMasuk)}
                          className="rc-thumb"
                          alt="foto masuk"
                          onError={e => {
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = '1'
                              // Fallback: URL tanpa size parameter
                              const id = item.fotoMasuk.match(/\/d\/([^/=?&]+)/)?.[1]
                                      || item.fotoMasuk.match(/[?&]id=([^&=]+)/)?.[1]
                              if (id) e.target.src = `https://lh3.googleusercontent.com/d/${id}`
                              else e.target.style.display = 'none'
                            } else {
                              e.target.style.display = 'none'
                            }
                          }}
                        />
                      )}
                    </div>

                    {/* Jam Pulang */}
                    <div className="rc-time-row">
                      <div className="rc-dot dot-red"/>
                      <span className="rc-time-text">
                        {item.jamPulang
                          ? <strong>{item.jamPulang}</strong>
                          : <span style={{ color: '#9ca3af' }}>--:--</span>
                        } Pulang
                      </span>
                      {item.fotoPulang && (
                        <img
                          src={driveThumbUrl(item.fotoPulang)}
                          className="rc-thumb"
                          alt="foto pulang"
                          onError={e => {
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = '1'
                              const id = item.fotoPulang.match(/\/d\/([^/=?&]+)/)?.[1]
                                      || item.fotoPulang.match(/[?&]id=([^&=]+)/)?.[1]
                              if (id) e.target.src = `https://lh3.googleusercontent.com/d/${id}`
                              else e.target.style.display = 'none'
                            } else {
                              e.target.style.display = 'none'
                            }
                          }}
                        />
                      )}
                    </div>

                    {/* Total Jam */}
                    {item.totalJam && (
                      <div className="rc-time-row mt-2">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none"
                          stroke="currentColor"
                          style={{ marginRight: 8, marginLeft: -2, color: 'var(--grey-400)' }}>
                          <circle cx="8" cy="8" r="6" strokeWidth="1.5"/>
                          <path d="M8 5v3l2 2" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="rc-time-text text-black font-bold">{item.totalJam}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Summary Footer ── */}
        {!loading && riwayat.length > 0 && (
          <div className="riwayat-summary animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="font-bold">{totalHari} Hari</span>
            {totalJamStr && <> · <span className="font-bold">{totalJamStr}</span> Total</>}
          </div>
        )}
      </div>

      <BottomNav active="riwayat"/>
    </div>
  )
}
