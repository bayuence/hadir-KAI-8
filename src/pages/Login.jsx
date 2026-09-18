import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

// Cache TTL: 30 menit — cukup lama untuk menghindari GAS cold start berulang
const CACHE_TTL_MS = 30 * 60 * 1000

// Ambil cache peserta dari localStorage dengan aman + cek apakah masih fresh
function getCachedPeserta() {
  try {
    const cached = localStorage.getItem('kai_peserta_list')
    if (!cached) return []
    const parsed = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) { return [] }
}

function isCacheFresh() {
  try {
    const ts = localStorage.getItem('kai_peserta_list_ts')
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < CACHE_TTL_MS
  } catch (_) { return false }
}

export default function Login() {
  const { loginContext } = useAuth()
  const navigate = useNavigate()

  // ─── State ─────────────────────────────────────────────────
  const [namaCari, setNamaCari]         = useState('')
  const [namaSelected, setNamaSelected] = useState(null)   // { id, nama } | null
  const [showDropdown, setShowDropdown] = useState(false)
  const [tanggal, setTanggal]           = useState('')
  const [bulan, setBulan]               = useState('')
  const [tahun, setTahun]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  // Daftar nama: langsung pakai cache (instant), lalu refresh di background
  const [daftarNama, setDaftarNama]         = useState(getCachedPeserta)
  const [loadingPeserta, setLoadingPeserta] = useState(false)

  const dropdownRef = useRef(null)
  const inputRef    = useRef(null)
  const isMounted   = useRef(true)
  const touchStartX = useRef(0)
  const touchEndX   = useRef(0)

  // Cleanup on unmount — hindari setState setelah component unmount
  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // ─── Touch swipe ────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current   = e.targetTouches[0].clientX
  }
  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }
  const handleTouchEnd = () => {
    if (Math.abs(touchStartX.current - touchEndX.current) > 75) navigate(-1)
  }

  // ─── Close dropdown on outside click / touch ────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  // ─── Fetch daftar nama dengan auto-retry (maks 2x) ─────────
  const fetchPeserta = useCallback(async (attempt = 0, force = false) => {
    if (!isMounted.current) return

    // Cache cerdas: skip fetch ke GAS kalau data masih fresh (< 30 menit)
    // kecuali dipaksa (tombol "Muat ulang" atau retry manual)
    if (!force && attempt === 0 && isCacheFresh() && getCachedPeserta().length > 0) {
      return // cache masih valid, tidak perlu hit GAS
    }

    setLoadingPeserta(true)
    try {
      const data = await api.getPesertaList()
      if (!isMounted.current) return
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setDaftarNama(data.data)
        try {
          localStorage.setItem('kai_peserta_list', JSON.stringify(data.data))
          localStorage.setItem('kai_peserta_list_ts', String(Date.now()))
        } catch (_) {}
        setLoadingPeserta(false)
      } else if (data.timeout && attempt < 1) {
        // Timeout GAS (cold start) — retry 1x dengan jeda 3 detik
        setTimeout(() => fetchPeserta(attempt + 1, force), 3000)
      } else if (!data.timeout && attempt < 2) {
        // Retry biasa untuk response kosong
        setTimeout(() => fetchPeserta(attempt + 1, force), 2000)
      } else {
        setLoadingPeserta(false)
      }
    } catch (_) {
      if (!isMounted.current) return
      if (attempt < 2) {
        setTimeout(() => fetchPeserta(attempt + 1, force), 2000)
      } else {
        setLoadingPeserta(false)
      }
    }
  }, [])

  useEffect(() => {
    // Refresh dari API saat mount — lewati jika cache masih fresh
    fetchPeserta(0, false)
  }, [fetchPeserta])

  // ─── Filter dropdown ─────────────────────────────────────────
  const filtered = namaCari.trim()
    ? daftarNama.filter(p =>
        p.nama.toLowerCase().includes(namaCari.toLowerCase().trim())
      )
    : daftarNama.slice(0, 50) // tampilkan semua saat fokus tanpa input (max 50)

  // ─── Pilih dari dropdown ─────────────────────────────────────
  const pilihNama = (peserta) => {
    setNamaSelected(peserta)      // simpan objek lengkap { id, nama }
    setNamaCari(peserta.nama)     // tampilkan nama di input
    setShowDropdown(false)
    setError('')
    inputRef.current?.blur()
  }

  // ─── Handle perubahan input nama ─────────────────────────────
  const handleNamaChange = (e) => {
    const val = e.target.value
    setNamaCari(val)
    setNamaSelected(null)         // PENTING: reset pilihan agar tidak kirim nama lama
    setShowDropdown(true)
    setError('')
  }

  // ─── Submit login ─────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    // Cari nama: dari pilihan dropdown atau exact match manual
    let targetPeserta = namaSelected
    if (!targetPeserta && namaCari.trim()) {
      const match = daftarNama.find(
        p => p.nama.toLowerCase().trim() === namaCari.trim().toLowerCase()
      )
      if (match) targetPeserta = match
    }

    // Validasi nama
    if (!targetPeserta) {
      if (!namaCari.trim()) {
        return setError('Ketik dan pilih namamu dari daftar.')
      }
      if (daftarNama.length === 0) {
        return setError('Daftar peserta belum termuat. Tunggu sebentar atau tap "Muat ulang".')
      }
      return setError('Nama tidak ditemukan. Pilih nama dari dropdown.')
    }

    // Validasi tanggal lahir
    const tgl = parseInt(tanggal, 10)
    const thn = parseInt(tahun, 10)
    if (!tanggal || !bulan || !tahun) return setError('Lengkapi tanggal lahir kamu.')
    if (isNaN(tgl) || tgl < 1 || tgl > 31) return setError('Tanggal tidak valid (1–31).')
    if (String(tahun).length !== 4 || isNaN(thn)) return setError('Tahun harus 4 digit.')
    if (thn < 1990 || thn > 2015) return setError('Tahun lahir di luar rentang yang wajar.')

    const tglLahir = `${String(tgl).padStart(2,'0')}/${String(bulan).padStart(2,'0')}/${tahun}`

    setLoading(true)
    try {
      const data = await api.login(targetPeserta.nama, tglLahir)
      if (!isMounted.current) return
      if (data.success) {
        loginContext(data.user, data.token)
        // Redirect otomatis via PublicRoute di App.jsx
      } else {
        setError(data.message || 'Nama atau tanggal lahir tidak cocok. Periksa kembali.')
      }
    } catch {
      if (!isMounted.current) return
      setError('Gagal terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="login-wrap">
        <div className="login-header animate-fade-in">
          <img src="/logo-kai.png" alt="KAI" className="login-logo" />
          <div>
            <h1 className="login-title">Masuk</h1>
            <p className="login-subtitle">Sistem Presensi Magang KAI Daop 8</p>
          </div>
        </div>

        <form className="login-form animate-fade-up" onSubmit={handleLogin} noValidate>

          {/* ── Input Nama ── */}
          <div className="input-group" ref={dropdownRef}>
            <div className="input-label-row">
              <label className="input-label">Nama Kamu</label>
              {loadingPeserta && (
                <span className="peserta-loading-badge">
                  <span className="spinner-tiny" /> Memuat daftar...
                </span>
              )}
              {!loadingPeserta && daftarNama.length === 0 && (
                <button
                  type="button"
                  className="retry-badge"
                  onClick={() => fetchPeserta(0, true)}
                >
                  ↺ Muat ulang
                </button>
              )}
            </div>
            <div className="dropdown-wrap">
              <div className="input-icon-wrap">
                <svg className="input-icon" viewBox="0 0 20 20" fill="none">
                  <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 17s.875-4 7-4 7 4 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  ref={inputRef}
                  className={`input input-with-icon${namaSelected ? ' input-selected' : ''}`}
                  type="text"
                  placeholder={loadingPeserta && daftarNama.length === 0
                    ? 'Memuat daftar peserta...'
                    : 'Cari atau ketik namamu...'}
                  value={namaCari}
                  onChange={handleNamaChange}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {/* Ikon centang jika nama sudah dipilih */}
                {namaSelected && (
                  <svg className="input-check-icon" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#22c55e" opacity="0.15"/>
                    <path d="M5 8l2 2 4-4" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Dropdown list */}
              {showDropdown && filtered.length > 0 && (
                <ul className="dropdown-list">
                  {filtered.map(p => (
                    <li
                      key={p.id}
                      className={`dropdown-item${namaSelected?.id === p.id ? ' dropdown-item--active' : ''}`}
                      onMouseDown={() => pilihNama(p)}
                      onTouchEnd={(ev) => { ev.preventDefault(); pilihNama(p) }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
                        <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s.7-3 6-3 6 3 6 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>{p.nama}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Nama tidak ditemukan */}
              {showDropdown && namaCari.trim() && filtered.length === 0 && daftarNama.length > 0 && (
                <div className="dropdown-empty">Nama tidak ditemukan dalam daftar</div>
              )}
            </div>
          </div>

          {/* ── Tanggal Lahir ── */}
          <div className="input-group">
            <label className="input-label">Tanggal Lahir</label>
            <div className="dob-row">
              <div className="dob-field">
                <input
                  className="input dob-input"
                  type="number"
                  placeholder="DD"
                  min="1"
                  max="31"
                  value={tanggal}
                  onChange={e => { setTanggal(e.target.value); setError('') }}
                  inputMode="numeric"
                />
                <span className="dob-label">Tanggal</span>
              </div>
              <div className="dob-field">
                <select
                  className="input dob-input"
                  value={bulan}
                  onChange={e => { setBulan(e.target.value); setError('') }}
                >
                  <option value="">MM</option>
                  {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
                <span className="dob-label">Bulan</span>
              </div>
              <div className="dob-field">
                <input
                  className="input dob-input"
                  type="number"
                  placeholder="YYYY"
                  min="1990"
                  max="2015"
                  value={tahun}
                  onChange={e => { setTahun(e.target.value); setError('') }}
                  inputMode="numeric"
                />
                <span className="dob-label">Tahun</span>
              </div>
            </div>
          </div>

          {/* ── Error message ── */}
          {error && (
            <div className="login-error animate-scale-in" role="alert">
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
                <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            className={`btn btn-primary mt-4 ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" /> Memverifikasi...</>
              : 'Masuk →'
            }
          </button>
        </form>

        <div className="login-register animate-fade-up">
          <span>Belum terdaftar?</span>
          <Link to="/daftar" className="login-register-link">Daftar sekarang</Link>
        </div>

        <p className="onboard-footer" style={{marginTop: 'auto', paddingTop: 24}}>
          Sistem Presensi Digital Magang — KAI Daop 8 Unit Operasi
        </p>
      </div>
    </div>
  )
}
