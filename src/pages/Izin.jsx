import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import { driveThumbUrl } from '../utils/driveImage'
import { formatTglIndo } from '../utils/dateFormat'
import './Izin.css'

export default function Izin() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const webcamRef = useRef(null)

  const [jenis, setJenis] = useState('Sakit')
  const [keterangan, setKeterangan] = useState('')
  const [foto64, setFoto64] = useState('')
  const [previewFoto, setPreviewFoto] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [riwayat, setRiwayat] = useState([])
  const [riwayatLoading, setRiwayatLoading] = useState(true)

  // Camera state
  const [useCamera, setUseCamera] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // Default kamera belakang (wide)
  
  // Tanggal dikunci ke hari ini
  const todayRaw = new Date().toISOString().split('T')[0]
  const [jam, setJam] = useState(new Date().toLocaleTimeString('id-ID', { hour12: false }))

  useEffect(() => {
    const t = setInterval(() => setJam(new Date().toLocaleTimeString('id-ID', { hour12: false })), 1000)
    return () => clearInterval(t)
  }, [])

  // Mengambil riwayat izin dengan memanggil api.getRiwayat dan filter izin
  const fetchRiwayat = () => {
    if (!user?.id || !token) return
    setRiwayatLoading(true)
    api.getRiwayat(user.id, token)
      .then(res => {
        if (res.success && res.data) {
          const izinList = res.data.filter(item => item.status && item.status.toLowerCase().startsWith('ijin'))
          // Map agar sesuai format yang diharapkan komponen list riwayat izin
          const mapped = izinList.map(i => {
            let j = 'Lainnya'
            if (i.status === 'Ijin Sakit') j = 'Sakit'
            if (i.status === 'Ijin Kampus') j = 'Kuliah'
            return {
              tanggal: i.tanggal,
              jenis: j,
              keterangan: i.lokasi ? i.lokasi.replace(/^Izin \(Online\)\s*(?:\((.*?)\))?$/, '$1').trim() : '',
              fotoUrl: i.fotoMasuk,
              status: 'Tercatat'
            }
          })
          setRiwayat(mapped)
        }
      })
      .catch(() => {})
      .finally(() => setRiwayatLoading(false))
  }

  useEffect(() => {
    fetchRiwayat()
  }, [user, token])

  // Kompresi Gambar ke ~100KB
  const compressImage = (dataUrl, callback) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const MAX_DIM = 800 // Membatasi dimensi agar ukuran terjaga ~100KB

      if (width > height) {
        if (width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        }
      } else {
        if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      
      // Kualitas 0.6 menghasilkan ukuran sangat ringan (biasanya 50-90KB)
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6)
      callback(compressedBase64)
    }
    img.src = dataUrl
  }

  // Handle Capture Camera
  const ambilFotoKamera = useCallback((e) => {
    e.preventDefault()
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      compressImage(imageSrc, (compressed) => {
        setFoto64(compressed)
        setPreviewFoto(compressed)
        setUseCamera(false)
      })
    }
  }, [webcamRef])

  const handleRemoveFoto = (e) => {
    e.stopPropagation()
    setFoto64('')
    setPreviewFoto('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!foto64) {
      return alert('Wajib mengambil foto bukti secara langsung menggunakan kamera.')
    }
    if (jenis === 'Lainnya' && !keterangan.trim()) {
      return alert('Silakan isi keterangan untuk jenis izin Lainnya.')
    }

    setLoading(true)
    try {
      const res = await api.ajukanIzin({
        idPeserta: user.id,
        token,
        tanggal: todayRaw,
        jenis,
        keterangan: keterangan.trim(),
        foto64: foto64 ? foto64.split(',')[1] : '' // Kirim base64 murni tanpa prefix MIME
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
    { 
      id: 'Sakit', label: 'Sakit', desc: 'Surat dokter / kondisi medis',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12m-6-6h12"/><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/></svg>
    },
    { 
      id: 'Kuliah', label: 'Kuliah', desc: 'Acara kampus / ujian / praktikum',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    },
    { 
      id: 'Lainnya', label: 'Lainnya', desc: 'Keperluan mendesak / dinas',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    }
  ]

  // Render Jika Sedang Buka Kamera
  if (useCamera) {
    return (
      <div className="app-shell bg-black" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <button type="button" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16 }} onClick={() => setUseCamera(false)}>Batal</button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontWeight: 600, display: 'block', fontSize: 15 }}>Kamera Bukti Izin</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Real-time Photo</span>
          </div>
          <button type="button" style={{ background: 'none', border: 'none', color: '#fff' }} onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} title="Ganti Kamera">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode, aspectRatio: 3/4 }}
            mirrored={facingMode === 'user'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ padding: '24px 20px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            onClick={ambilFotoKamera}
            style={{
              width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '4px solid #cbd5e1', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#004990' }} />
          </button>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Ketuk untuk mengambil foto langsung</span>
        </div>
      </div>
    )
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
              Pengajuan izin <strong>{jenis}</strong> hari ini telah tersimpan di sistem presensi.
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
            {/* Tanggal Terkunci ke Hari Ini */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Tanggal Izin
                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Otomatis Real-time</span>
              </label>
              <div className="input" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'not-allowed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Hari Ini
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{jam}</span>
              </div>
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
                    {j.icon}
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

            {/* Foto Bukti Wajib Real-Time Kamera */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Foto Bukti Langsung <span style={{ color: '#ef4444' }}>*</span></span>
                <span style={{ fontSize: '0.7rem', color: '#004990', fontWeight: 600 }}>🔒 Real-Time Only</span>
              </label>
              
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
                  <div className="izin-preview-tag">✓ Foto Real-Time Terverifikasi</div>
                  <button
                    type="button"
                    style={{
                      position: 'absolute', bottom: 10, right: 10, background: 'rgba(15,23,42,0.8)', color: '#fff',
                      border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                      backdropFilter: 'blur(4px)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                    }}
                    onClick={() => setUseCamera(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    Foto Ulang
                  </button>
                </div>
              ) : (
                <div 
                  className="izin-upload" 
                  style={{ padding: '22px 16px', background: '#f0f7ff', borderColor: '#93c5fd' }}
                  onClick={() => setUseCamera(true)}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: '#004990', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6
                  }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#004990' }}>Ambil Foto Bukti (Kamera)</span>
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
                        {item.jenis === 'Sakit' ? (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12m-6-6h12"/><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/></svg>
                        ) : item.jenis === 'Kuliah' ? (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        )}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="text-sm font-bold">{formatTglIndo(item.tanggal)}</span>
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

