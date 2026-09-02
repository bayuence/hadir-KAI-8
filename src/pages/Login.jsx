import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export default function Login() {
  const { loginContext } = useAuth()
  const [namaCari, setNamaCari] = useState('')
  const [namaSelected, setNamaSelected] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [tanggal, setTanggal] = useState('')
  const [bulan, setBulan] = useState('')
  const [tahun, setTahun] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [daftarNama, setDaftarNama] = useState([])
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = e.targetTouches[0].clientX // Reset on start
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    if (Math.abs(swipeDistance) > 75) {
      // Swiped left or right significantly
      navigate(-1)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    api.getPesertaList()
      .then(data => {
        if (data.success) setDaftarNama(data.data)
      })
      .catch(() => {})
  }, [])

  const filtered = daftarNama.filter(p =>
    p.nama.toLowerCase().includes(namaCari.toLowerCase())
  )

  const pilihNama = (peserta) => {
    setNamaSelected(peserta.nama)
    setNamaCari(peserta.nama)
    setShowDropdown(false)
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!namaSelected) return setError('Pilih nama kamu dari daftar')
    if (!tanggal || !bulan || !tahun) return setError('Lengkapi tanggal lahir')
    if (tanggal < 1 || tanggal > 31) return setError('Tanggal tidak valid')
    if (tahun.length !== 4) return setError('Tahun harus 4 digit')

    const tglLahir = `${String(tanggal).padStart(2,'0')}/${String(bulan).padStart(2,'0')}/${tahun}`

    setLoading(true)
    try {
      const data = await api.login(namaSelected, tglLahir)
      if (data.success) {
        loginContext(data.user, data.token)
        // Redirection happens automatically via App.jsx PublicRoute constraint
      } else {
        setError(data.message || 'Data tidak cocok. Periksa kembali.')
      }
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet.')
    } finally {
      setLoading(false)
    }
  }

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
          <div className="input-group" ref={dropdownRef}>
            <label className="input-label">Nama Kamu</label>
            <div className="dropdown-wrap">
              <div className="input-icon-wrap">
                <svg className="input-icon" viewBox="0 0 20 20" fill="none">
                  <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 17s.875-4 7-4 7 4 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  className="input input-with-icon"
                  type="text"
                  placeholder="Cari atau ketik namamu..."
                  value={namaCari}
                  onChange={e => {
                    setNamaCari(e.target.value)
                    setNamaSelected('')
                    setShowDropdown(true)
                    setError('')
                  }}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                />
              </div>
              {showDropdown && filtered.length > 0 && (
                <ul className="dropdown-list">
                  {filtered.map(p => (
                    <li key={p.id} className="dropdown-item" onMouseDown={() => pilihNama(p)}>
                      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s.7-3 6-3 6 3 6 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {p.nama}
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && namaCari && filtered.length === 0 && (
                <div className="dropdown-empty">Nama tidak ditemukan</div>
              )}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Tanggal Lahir</label>
            <div className="dob-row">
              <div className="dob-field">
                <input className="input dob-input" type="number" placeholder="DD" min="1" max="31" value={tanggal} onChange={e => setTanggal(e.target.value)} />
                <span className="dob-label">Tanggal</span>
              </div>
              <div className="dob-field">
                <select className="input dob-input" value={bulan} onChange={e => setBulan(e.target.value)}>
                  <option value="">MM</option>
                  {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
                <span className="dob-label">Bulan</span>
              </div>
              <div className="dob-field">
                <input className="input dob-input" type="number" placeholder="YYYY" min="1990" max="2010" value={tahun} onChange={e => setTahun(e.target.value)} />
                <span className="dob-label">Tahun</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="login-error animate-scale-in">
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
                <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className={`btn btn-primary mt-4 ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <><span className="spinner" /> Memverifikasi...</> : 'Masuk →'}
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
