import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import { driveThumbUrl } from '../utils/driveImage'
import './Izin.css'

export default function Izin() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const fileInputRef = useRef(null)

  const [jenis, setJenis] = useState('Sakit')
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0])
  const [keterangan, setKeterangan] = useState('')
  const [foto64, setFoto64] = useState('')
  const [previewFoto, setPreviewFoto] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [riwayat, setRiwayat] = useState([])
  const [riwayatLoading, setRiwayatLoading] = useState(true)

  const fetchRiwayat = () => {
    if (!user?.id || !token) return
    setRiwayatLoading(true)
    api.getIzinSaya(user.id, token)
      .then(res => {
        if (res.success) setRiwayat(res.data || [])
      })
      .catch(() => {})
      .finally(() => setRiwayatLoading(false))
  }

  useEffect(() => {
    fetchRiwayat()
  }, [user, token])

  // Resize & compress image file ke Base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1000
        const MAX_HEIGHT = 1000
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setFoto64(compressedBase64)
        setPreviewFoto(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFoto = (e) => {
    e.stopPropagation()
    setFoto64('')
    setPreviewFoto('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tanggal) return alert('Silakan pilih tanggal izin.')
    if (jenis === 'Lainnya' && !keterangan.trim()) {
      return alert('Silakan isi keterangan untuk jenis izin Lainnya.')
    }

    setLoading(true)
    try {
      const res = await api.ajukanIzin({
        idPeserta: user.id,
        token,
        tanggal,
        jenis,
        keterangan: keterangan.trim(),
        foto64: foto64 || ''
      })

      if (res.success) {
        setSubmitted(true)
        fetchRiwayat()
      } else {
        alert(res.message || 'Gagal mengajukan izin.')
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const jenisList = [
    { id: 'Sakit', label: 'Sakit', icon: '🩺', desc: 'Surat dokter / kondisi medis' },
    { id: 'Kuliah', label: 'Kuliah', icon: '🎓', desc: 'Acara kampus / ujian / praktikum' },
    { id: 'Lainnya', label: 'Lainnya', icon: '📋', desc: 'Keperluan mendesak / dinas / lainnya' }
  ]

  const formatTanggal = (str) => {
    if (!str) return '—'
    const parts = str.split(/[\/\-\.]/)
    if (parts.length === 3) {
      const d = parts[0].length === 4 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(parts[2], parts[1] - 1, parts[0])
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      }
    }
    return str
  }

  return (
    <div className="app-shell bg-white">
      <div className="page-header">
        <h1>Ajukan Izin</h1>
      </div>

      <div className="izin-wrap">
        {submitted ? (
          <div className="text-center mt-6 animate-scale-in" style={{ padding: '30px 16px', background: '#f8fafc', borderRadius: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Izin Berhasil Dicatat!</h2>
            <p className="text-grey text-sm" style={{ maxWidth: 280, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Pengajuan izin <strong>{jenis}</strong> pada tanggal <strong>{formatTanggal(tanggal)}</strong> telah tersimpan di sistem presensi.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                onClick={() => {
                  setSubmitted(false)
                  setKeterangan('')
                  setFoto64('')
                  setPreviewFoto('')
                }}
              >
                Buat Lagi
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                onClick={() => navigate('/riwayat')}
              >
                Lihat di Riwayat
              </button>
            </div>
          </div>
        ) : (
          <form className="izin-form animate-fade-up" onSubmit={handleSubmit}>
            {/* Tanggal */}
            <div className="input-group">
              <label className="input-label">Tanggal Izin</label>
              <input
                type="date"
                className="input"
                required
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
              />
            </div>

            {/* Jenis Izin Pills */}
            <div className="input-group">
              <label className="input-label">Jenis Izin</label>
              <div className="izin-pills">
                {jenisList.map(j => (
                  <button
                    key={j.id}
                    type="button"
                    className={`izin-pill ${jenis === j.id ? 'active' : ''}`}
                    onClick={() => setJenis(j.id)}
                  >
                    <span style={{ marginRight: 6 }}>{j.icon}</span>
                    <span>{j.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                {jenisList.find(j => j.id === jenis)?.desc}
              </p>
            </div>

            {/* Keterangan */}
            <div className="input-group">
              <label className="input-label">
                Keterangan {jenis === 'Lainnya' ? <span style={{ color: '#ef4444' }}>*</span> : '(Opsional)'}
              </label>
              <textarea
                className="input izin-textarea"
                placeholder={jenis === 'Sakit' ? 'Contoh: Demam tinggi, istirahat dokter...' : jenis === 'Kuliah' ? 'Contoh: Mengikuti bimbingan skripsi / praktikum...' : 'Jelaskan alasan izin Anda...'}
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
              />
            </div>

            {/* Upload Lampiran Bukti */}
            <div className="input-group">
              <label className="input-label">Foto Bukti / Dokumen (Opsional)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              
              {previewFoto ? (
                <div className="izin-preview-box">
                  <img src={previewFoto} alt="Preview Bukti" className="izin-preview-img" />
                  <button
                    type="button"
                    className="izin-remove-btn"
                    onClick={handleRemoveFoto}
                    title="Hapus foto"
                  >
                    ✕
                  </button>
                  <div className="izin-preview-tag">✓ Foto Terlampir</div>
                </div>
              ) : (
                <div className="izin-upload" onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Upload Foto / Surat Bukti</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Surat dokter, surat kampus, atau foto kegiatan (JPG/PNG)</span>
                </div>
              )}
            </div>

            <button type="submit" className={`btn btn-primary mt-2 ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Kirim Pengajuan Izin'}
            </button>
          </form>
        )}

        {/* Riwayat Izin */}
        <div className="izin-history animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="input-label" style={{ margin: 0 }}>Riwayat Pengajuan Izin</h3>
            {riwayat.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{riwayat.length} data</span>
            )}
          </div>

          {riwayatLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Memuat riwayat...</div>
          ) : riwayat.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Belum ada riwayat pengajuan izin.</div>
          ) : (
            <div className="ih-list">
              {riwayat.map((item, i) => (
                <div className="ih-row" key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.fotoUrl ? (
                      <img
                        src={driveThumbUrl(item.fotoUrl)}
                        alt="Bukti"
                        className="ih-thumb"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="ih-thumb-placeholder">
                        {item.jenis === 'Sakit' ? '🩺' : item.jenis === 'Kuliah' ? '🎓' : '📋'}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="text-sm font-bold">{formatTanggal(item.tanggal)}</span>
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {item.jenis || 'Izin'}
                        </span>
                      </div>
                      {item.keterangan && (
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '3px 0 0' }}>
                          {item.keterangan}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Tercatat</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <BottomNav active="izin" />
    </div>
  )
}

