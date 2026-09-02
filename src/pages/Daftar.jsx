import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import './Daftar.css'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export default function Daftar() {
  const [formData, setFormData] = useState({
    nama: '',
    tanggal: '',
    bulan: '',
    tahun: '',
    alamat: '',
    noHp: '',
    email: '',
    kampus: '',
    jurusan: '',
    mulaiMagang: '',
    selesaiMagang: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const navigate = useNavigate()
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const [fotoBase64, setFotoBase64] = useState('')

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = e.targetTouches[0].clientX 
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    if (Math.abs(swipeDistance) > 75) {
      navigate(-1)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoBase64(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const requiredFields = ['nama', 'alamat', 'noHp', 'email', 'kampus', 'jurusan', 'mulaiMagang', 'selesaiMagang']
    for (let field of requiredFields) {
      if (!formData[field]) return setError(`Harap isi semua data dengan lengkap`)
    }

    if (!formData.tanggal || !formData.bulan || !formData.tahun) return setError('Lengkapi tanggal lahir')
    if (formData.tanggal < 1 || formData.tanggal > 31) return setError('Tanggal lahir tidak valid')
    if (formData.tahun.length !== 4) return setError('Tahun lahir harus 4 digit')
    
    if (!fotoBase64) return setError('Harap unggah foto profil Anda')

    const tglLahir = `${String(formData.tanggal).padStart(2,'0')}/${String(formData.bulan).padStart(2,'0')}/${formData.tahun}`
    const payload = { ...formData, tanggalLahir: tglLahir, foto64: fotoBase64 }
    
    // Remove individual date parts from payload if needed, though harmless to leave
    delete payload.tanggal
    delete payload.bulan
    delete payload.tahun

    setLoading(true)
    try {
      const data = await api.register(payload)
      if (data.success) {
        setSuccess('Pendaftaran berhasil! Mengalihkan ke halaman masuk...')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError(data.message || 'Gagal mendaftar. Silakan coba lagi.')
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
      <div className="login-wrap" style={{ paddingBottom: '40px' }}>
        <div className="login-header animate-fade-in" style={{ marginBottom: '24px' }}>
          <img src="/logo kai.PNG" alt="KAI" className="login-logo" />
          <div>
            <h1 className="login-title">Daftar</h1>
            <p className="login-subtitle">Buat akun presensi magang baru</p>
          </div>
        </div>

        <form className="login-form animate-fade-up" onSubmit={handleRegister} noValidate style={{ gap: '14px' }}>
          
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <div className="input-icon-wrap">
              <input className="input" type="text" name="nama" placeholder="Sesuai KTP" value={formData.nama} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Tanggal Lahir (Sebagai PIN Masuk)</label>
            <div className="dob-row">
              <div className="dob-field">
                <input className="input dob-input" type="number" name="tanggal" placeholder="DD" min="1" max="31" value={formData.tanggal} onChange={handleChange} />
                <span className="dob-label">Tanggal</span>
              </div>
              <div className="dob-field">
                <select className="input dob-input" name="bulan" value={formData.bulan} onChange={handleChange}>
                  <option value="">MM</option>
                  {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
                <span className="dob-label">Bulan</span>
              </div>
              <div className="dob-field">
                <input className="input dob-input" type="number" name="tahun" placeholder="YYYY" min="1990" max="2010" value={formData.tahun} onChange={handleChange} />
                <span className="dob-label">Tahun</span>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Alamat</label>
            <div className="input-icon-wrap">
              <input className="input" type="text" name="alamat" placeholder="Alamat domisili" value={formData.alamat} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">No HP / WhatsApp</label>
            <div className="input-icon-wrap">
              <input className="input" type="tel" name="noHp" placeholder="Misal: 08123456789" value={formData.noHp} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-icon-wrap">
              <input className="input" type="email" name="email" placeholder="Alamat email aktif" value={formData.email} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Kampus / Sekolah</label>
            <div className="input-icon-wrap">
              <input className="input" type="text" name="kampus" placeholder="Asal instansi" value={formData.kampus} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Jurusan</label>
            <div className="input-icon-wrap">
              <input className="input" type="text" name="jurusan" placeholder="Program studi" value={formData.jurusan} onChange={handleChange} autoComplete="off" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Foto Profil</label>
            <div className="input-icon-wrap">
              <input className="input" type="file" accept="image/*" onChange={handleFileChange} style={{ padding: '10px' }} />
            </div>
          </div>

          <div className="dob-row" style={{ marginTop: '4px' }}>
            <div className="dob-field">
              <label className="input-label" style={{ marginBottom: 0 }}>Mulai Magang</label>
              <input className="input" type="date" name="mulaiMagang" value={formData.mulaiMagang} onChange={handleChange} style={{ padding: '12px' }} />
            </div>
            <div className="dob-field">
              <label className="input-label" style={{ marginBottom: 0 }}>Selesai Magang</label>
              <input className="input" type="date" name="selesaiMagang" value={formData.selesaiMagang} onChange={handleChange} style={{ padding: '12px' }} />
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

          {success && (
            <div className="login-error animate-scale-in" style={{background: '#dcfce7', color: '#166534'}}>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
                <path d="M13.5 4.5l-7 7-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}

          <button type="submit" className={`btn btn-primary mt-4 ${loading ? 'loading' : ''}`} disabled={loading || success}>
            {loading ? <><span className="spinner" /> Memproses...</> : 'Daftar →'}
          </button>
        </form>

        <div className="login-register animate-fade-up">
          <span>Sudah punya akun?</span>
          <Link to="/login" className="login-register-link">Masuk sekarang</Link>
        </div>

        <p className="onboard-footer" style={{marginTop: 'auto', paddingTop: 24}}>
          Sistem Presensi Digital Magang — KAI Daop 8 Unit Operasi
        </p>
      </div>
    </div>
  )
}
