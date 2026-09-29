import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FaceScanner from '../components/FaceScanner'
import { useFaceRecognition } from '../hooks/useFaceRecognition'
import { useAuth } from '../context/AuthContext'
import { driveAvatarUrl } from '../utils/driveImage'
import Avatar from '../components/Avatar'

/**
 * FaceTest - Uji Coba Face Recognition
 * 
 * Alur:
 * 1. Pertama kali: daftar wajah pakai kamera (simpan di localStorage)
 * 2. Sesudah terdaftar: kamera langsung menyala di atas, foto profil di bawah sebagai referensi visual
 * 3. Scan wajah langsung dicocokkan dengan data yang tersimpan
 */
export default function FaceTest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { modelReady, loadingModel, modelError, loadModels, serializeDescriptor, deserializeDescriptor } = useFaceRecognition()

  // Step: 'idle' | 'register' | 'verifying' | 'result'
  const [step, setStep] = useState('idle')
  const [savedDescriptor, setSavedDescriptor] = useState(null)
  const [savedPhoto, setSavedPhoto] = useState(null)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [result, setResult] = useState(null)

  // Load descriptor dari localStorage saat pertama kali mount
  useEffect(() => {
    const stored = localStorage.getItem('kai_face_descriptor')
    const storedPhoto = localStorage.getItem('kai_face_photo')
    if (stored) {
      try {
        const desc = deserializeDescriptor(stored)
        setSavedDescriptor(desc)
        if (storedPhoto) setSavedPhoto(storedPhoto)
        setStep('verifying')
      } catch (err) {
        localStorage.removeItem('kai_face_descriptor')
      }
    }
  }, [deserializeDescriptor])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  const handleRegisterCapture = (descriptor, photo) => {
    const serialized = serializeDescriptor(descriptor)
    localStorage.setItem('kai_face_descriptor', serialized)
    localStorage.setItem('kai_face_photo', photo)
    setSavedDescriptor(descriptor)
    setSavedPhoto(photo)
    setStep('verifying')
  }

  const handleVerifyCapture = (descriptor, photo, matchResult) => {
    setCapturedPhoto(photo)
    setResult({
      match: matchResult.match,
      distance: matchResult.distance,
      confidence: Math.round((1 - matchResult.distance) * 100)
    })
    setStep('result')
  }

  const handleReset = () => {
    localStorage.removeItem('kai_face_descriptor')
    localStorage.removeItem('kai_face_photo')
    setSavedDescriptor(null)
    setSavedPhoto(null)
    setStep('idle')
    setResult(null)
    setCapturedPhoto(null)
  }

  const profilePhotoUrl = user?.foto ? driveAvatarUrl(user.foto) : null

  // ─── Loading Model ───────────────────────────────────────────────────────────
  if (loadingModel) return (
    <div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' }}>
      <div className="profil-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '15px' }}>⏳</div>
        <h2 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 8px' }}>Memuat Sistem Wajah...</h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>Mohon tunggu sebentar.</p>
      </div>
    </div>
  )

  if (modelError) return (
    <div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' }}>
      <div className="profil-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '15px' }}>❌</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 10px', fontSize: '18px' }}>Gagal Memuat Model</h2>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '13px' }}>{modelError}</p>
        <button className="btn btn-primary" onClick={loadModels}>Coba Lagi</button>
      </div>
    </div>
  )

  // ─── STEP: IDLE — Belum ada wajah terdaftar ──────────────────────────────────
  if (step === 'idle') return (
    <div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>Uji Face Recognition</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Foto profil + info */}
        <div className="profil-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
          <Avatar src={user?.foto} name={user?.nama} size={64} style={{ borderRadius: '12px', flexShrink: 0 }} />
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{user?.nama || 'Pengguna'}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Foto profil ini akan jadi referensi visual perbandingan.</p>
          </div>
        </div>

        {/* Instruksi */}
        <div className="profil-card" style={{ padding: '18px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1d4ed8' }}>📋 Cara Kerja</h4>
          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#374151', lineHeight: '1.8' }}>
            <li>Klik <strong>"Daftar Wajah"</strong> — scan wajah Anda lewat kamera</li>
            <li>Setelah terdaftar, kamera akan <strong>langsung aktif</strong> di atas foto profil</li>
            <li>Sistem mencocokkan wajah dari kamera dengan data yang tersimpan</li>
          </ol>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={() => setStep('register')}>
          📸 Daftar Wajah via Kamera
        </button>
      </div>
    </div>
  )

  // ─── STEP: REGISTER — Ambil foto lewat kamera ────────────────────────────────
  if (step === 'register') return (
    <div className="app-shell" style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <button onClick={() => setStep('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#fff' }}>Daftar Wajah</h2>
      </div>
      <FaceScanner
        mode="register"
        onCapture={handleRegisterCapture}
        userName={user?.nama}
      />
    </div>
  )

  // ─── STEP: VERIFYING — Kamera di atas, foto profil di bawah ─────────────────
  if (step === 'verifying') return (
    <div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <button onClick={handleReset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>Verifikasi Wajah</h2>
      </div>

      {/* Kamera Scanner di atas */}
      <div style={{ position: 'relative' }}>
        {modelReady ? (
          <FaceScanner
            mode="verify"
            referenceDescriptor={savedDescriptor}
            onCapture={handleVerifyCapture}
            onFail={() => {}}
            userName={user?.nama}
          />
        ) : (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #fff', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Menyiapkan kamera...</p>
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
          📹 Kamera Langsung
        </div>
      </div>

      {/* Foto Profil Referensi di bawah */}
      <div style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Foto dari kamera saat daftar (lebih akurat karena lokal) */}
          {savedPhoto ? (
            <img src={savedPhoto} alt="Wajah terdaftar" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #22c55e' }} />
          ) : (
            <Avatar src={user?.foto} name={user?.nama} size={64} style={{ borderRadius: '10px' }} />
          )}
          <div style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#22c55e', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '2px solid #fff' }}>
            ✓
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontWeight: '700', color: '#166534', fontSize: '14px' }}>Wajah Terdaftar</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Foto ini jadi referensi pencocokan.<br/>Arahkan wajah Anda ke kamera di atas.</p>
        </div>
      </div>
    </div>
  )

  // ─── STEP: RESULT ────────────────────────────────────────────────────────────
  if (step === 'result') return (
    <div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <button onClick={() => { setResult(null); setCapturedPhoto(null); setStep('verifying') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>Hasil Verifikasi</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Hasil */}
        <div className="profil-card" style={{ textAlign: 'center', padding: '25px 20px', backgroundColor: result.match ? '#f0fdf4' : '#fef2f2', border: result.match ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
          <div style={{ fontSize: '56px', marginBottom: '10px' }}>{result.match ? '✅' : '❌'}</div>
          <h2 style={{ fontSize: '20px', color: result.match ? '#166534' : '#991b1b', margin: '0 0 5px' }}>
            {result.match ? 'Wajah Cocok!' : 'Wajah Berbeda'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {result.match ? 'Identitas berhasil diverifikasi.' : 'Wajah tidak cocok dengan data terdaftar.'}
          </p>
        </div>

        {/* Perbandingan foto */}
        <div className="profil-card" style={{ padding: '18px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Perbandingan Foto</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '18px' }}>
            {savedPhoto && (
              <div style={{ textAlign: 'center' }}>
                <img src={savedPhoto} alt="Terdaftar" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #22c55e', display: 'block' }} />
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>Terdaftar</p>
              </div>
            )}
            {capturedPhoto && (
              <div style={{ textAlign: 'center' }}>
                <img src={capturedPhoto} alt="Kamera" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #3b82f6', display: 'block' }} />
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>Kamera Sekarang</p>
              </div>
            )}
          </div>

          {/* Progress bar kesamaan */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Tingkat Kesamaan</span>
            <strong style={{ fontSize: '13px', color: result.match ? '#166534' : '#991b1b' }}>{result.confidence}%</strong>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: result.confidence + '%', height: '100%', backgroundColor: result.match ? '#22c55e' : '#ef4444', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#94a3b8' }}>Batas minimum kecocokan: 55%</p>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setResult(null); setCapturedPhoto(null); setStep('verifying') }}>
          🔄 Scan Ulang
        </button>
        <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleReset}>
          🗑️ Reset & Daftar Ulang
        </button>
      </div>
    </div>
  )

  return null
}
