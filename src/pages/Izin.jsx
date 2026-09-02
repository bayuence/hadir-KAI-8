import React, { useState, useEffect } from 'react'
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
  const [riwayat, setRiwayat] = useState([])
  const [riwayatLoading, setRiwayatLoading] = useState(true)

  const { user, token } = useAuth()

  useEffect(() => {
    if (!user?.id || !token) return
    api.getIzinSaya(user.id, token)
      .then(res => { if (res.success) setRiwayat(res.data || []) })
      .catch(() => {})
      .finally(() => setRiwayatLoading(false))
  }, [user, token])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!tanggal) return alert('Silakan pilih tanggal izin')
    if (!keterangan.trim()) return alert('Silakan isi keterangan')
    setLoading(true)
    api.ajukanIzin({ idPeserta: user.id, token, tanggal, jenis, keterangan })
      .then(res => {
        if (res.success) {
          setSubmitted(true)
          setTimeout(() => navigate('/dashboard'), 2500)
        } else {
          alert(res.message || 'Gagal mengajukan izin')
        }
      })
      .catch(() => alert('Terjadi kesalahan jaringan'))
      .finally(() => setLoading(false))
  }

  const jenisList = ['Sakit', 'Mendesak', 'Dinas', 'Lainnya']

  const statusBadge = (status) => {
    if (status === 'approved') return <span className="badge badge-green">Disetujui</span>
    if (status === 'rejected') return <span className="badge badge-red">Ditolak</span>
    return <span className="badge badge-amber">Menunggu</span>
  }

  const formatTanggal = (str) => {
    if (!str) return '—'
    const d = new Date(str)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="app-shell bg-white">
      <div className="page-header">
        <h1>Ajukan Izin</h1>
      </div>

      <div className="izin-wrap">
        {submitted ? (
          <div className="text-center mt-8 animate-scale-in">
            <div style={{ marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Pengajuan Berhasil</h2>
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

        {/* Riwayat Izin — data real dari API */}
        {!submitted && (
          <div className="izin-history animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="input-label mb-4">Riwayat Izin</h3>
            {riwayatLoading ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Memuat...</div>
            ) : riwayat.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Belum ada riwayat pengajuan izin.</div>
            ) : (
              riwayat.map((item, i) => (
                <div className="ih-row" key={i}>
                  <div>
                    <span className="text-sm font-bold">{formatTanggal(item.tanggal)}</span>
                    {item.jenis && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>{item.jenis}</span>}
                  </div>
                  {statusBadge(item.status)}
                </div>
              ))
            )}
          </div>
        )}

      </div>
      <BottomNav active="izin" />
    </div>
  )
}
