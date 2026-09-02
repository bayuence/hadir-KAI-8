import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import './Izin.css'

export default function Izin() {
  const navigate = useNavigate()
  const [jenis, setJenis] = useState('Sakit')
  const [tanggal, setTanggal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { user, token } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!tanggal || !keterangan) return alert('Lengkapi tanggal dan keterangan')
    setLoading(true)
    api.ajukanIzin({ idPeserta: user.id, token, tanggal, jenis, keterangan })
      .then(res => {
        if (res.success) {
          setSubmitted(true)
          setTimeout(() => navigate('/dashboard'), 2000)
        } else {
          alert(res.message || 'Gagal mengajukan izin')
        }
      })
      .catch(() => alert('Terjadi kesalahan jaringan'))
      .finally(() => setLoading(false))
  }

  const jenisList = ['Sakit', 'Mendesak', 'Dinas', 'Lainnya']

  return (
    <div className="app-shell bg-white">
      <div className="page-header">
        <h1>Ajukan Izin</h1>
      </div>
      
      <div className="izin-wrap">
        {/* Warning banner */}
        <div className="izin-warning animate-fade-in">
          ⚠️ Anda berada di luar area penugasan
        </div>

        {submitted ? (
          <div className="text-center mt-8 animate-scale-in">
            <div style={{fontSize:48, marginBottom:16}}>✅</div>
            <h2 style={{fontSize:18, fontWeight:700, marginBottom:8}}>Pengajuan Berhasil</h2>
            <p className="text-grey text-sm">Menunggu persetujuan admin. Mengalihkan ke dashboard...</p>
          </div>
        ) : (
          <form className="izin-form animate-fade-up" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Tanggal Izin</label>
              <input 
                type="date" 
                className="input" 
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Jenis Izin</label>
              <div className="izin-pills">
                {jenisList.map(j => (
                  <button 
                    key={j}
                    type="button"
                    className={`izin-pill ${jenis === j ? 'active' : ''}`}
                    onClick={() => setJenis(j)}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Keterangan</label>
              <textarea 
                className="input izin-textarea" 
                placeholder="Jelaskan alasan izin secara singkat..."
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Lampiran (opsional)</label>
              <div className="izin-upload">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Upload foto/dokumen</span>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary mt-4 ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Kirim Pengajuan'}
            </button>
          </form>
        )}

        {/* Riwayat Izin */}
        {!submitted && (
          <div className="izin-history animate-fade-up" style={{animationDelay:'0.1s'}}>
            <h3 className="input-label mb-4">Riwayat Izin</h3>
            <div className="ih-row">
              <span className="text-sm font-bold">26 Agu 2026</span>
              <span className="badge badge-green">Disetujui</span>
            </div>
            <div className="ih-row">
              <span className="text-sm font-bold">12 Jul 2026</span>
              <span className="badge badge-amber">Menunggu</span>
            </div>
          </div>
        )}

      </div>
      <BottomNav active="izin" />
    </div>
  )
}
