const fs = require('fs');

const faceTestCode = `import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FaceScanner from '../components/FaceScanner'
import { useFaceRecognition } from '../hooks/useFaceRecognition'
import { useAuth } from '../context/AuthContext'

/**
 * FaceTest - Halaman uji coba sistem face recognition
 * Menggunakan gaya (CSS) yang konsisten dengan aplikasi utama
 */
export default function FaceTest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { modelReady, loadingModel, modelError, loadModels, serializeDescriptor, deserializeDescriptor } = useFaceRecognition()

  const [step, setStep] = useState('idle') // idle | register | registerDone | verify | result
  const [savedDescriptor, setSavedDescriptor] = useState(null)
  const [savedPhoto, setSavedPhoto] = useState(null)

  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 1️⃣ Load descriptor tersimpan di localStorage (jika ada)
  useEffect(() => {
    const stored = localStorage.getItem('kai_face_descriptor')
    const storedPhoto = localStorage.getItem('kai_face_photo')
    if (stored) {
      try {
        const desc = deserializeDescriptor(stored)
        setSavedDescriptor(desc)
        if (storedPhoto) setSavedPhoto(storedPhoto)
      } catch (err) {
        console.error('Gagal memuat descriptor tersimpan:', err)
        localStorage.removeItem('kai_face_descriptor')
      }
    }
  }, [deserializeDescriptor])

  // 2️⃣ Minta model segera diload saat halaman dibuka
  useEffect(() => {
    loadModels()
  }, [loadModels])

  // 📸 REGISTER: Simpan descriptor ke state & localstorage
  const handleRegisterCapture = (descriptor, photo) => {
    const serialized = serializeDescriptor(descriptor)
    localStorage.setItem('kai_face_descriptor', serialized)
    localStorage.setItem('kai_face_photo', photo)
    setSavedDescriptor(descriptor)
    setSavedPhoto(photo)
    setStep('registerDone')
  }

  // 🔍 VERIFY: Cocokkan dan tampilkan hasil
  const handleVerifyCapture = (descriptor, photo, matchResult) => {
    setCapturedPhoto(photo)
    setResult({
      match: matchResult.match,
      distance: matchResult.distance,
      confidence: Math.round((1 - matchResult.distance) * 100)
    })
    setStep('result')
  }

  const handleVerifyFail = (reason) => {
    setErrorMsg(reason)
    setResult({ match: false })
    setCapturedPhoto(null)
    setStep('result')
  }

  const resetAll = () => {
    localStorage.removeItem('kai_face_descriptor')
    localStorage.removeItem('kai_face_photo')
    setSavedDescriptor(null)
    setSavedPhoto(null)
    setStep('idle')
    setResult(null)
    setCapturedPhoto(null)
    setErrorMsg('')
  }

  // ⏳ UI Loading Model
  if (loadingModel) return (
    <div className="lok-container">
      <div className="lok-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>⏳ Memuat Sistem Wajah...</h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>Mohon tunggu, sistem sedang memuat AI Neural Network.</p>
      </div>
    </div>
  )

  if (modelError) return (
    <div className="lok-container">
      <div className="lok-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>❌ Gagal Memuat Model</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>{modelError}</p>
        <button className="lok-btn-save" onClick={loadModels}>Coba Lagi</button>
      </div>
    </div>
  )

  // 🏠 STEP: IDLE
  if (step === 'idle') return (
    <div className="lok-container">
      <div className="lok-header">
        <button className="lok-btn-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>Uji Coba Wajah</h2>
      </div>

      <div className="lok-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {savedDescriptor ? (
            <>
              {savedPhoto ? (
                <img src={savedPhoto} alt="Wajah Terdaftar" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #3b82f6', marginBottom: '15px' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#e2e8f0', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
              )}
              <h3 style={{ margin: 0, color: '#1e293b' }}>Wajah Terdaftar</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '5px' }}>Wajah Anda siap digunakan untuk presensi.</p>
            </>
          ) : (
            <>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>📸</div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Belum Terdaftar</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '5px' }}>Daftarkan wajah Anda untuk mencoba simulasi verifikasi.</p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="lok-btn-save" onClick={() => setStep('register')} style={{ backgroundColor: savedDescriptor ? '#64748b' : '#3b82f6' }}>
            {savedDescriptor ? '🔄 Daftar Ulang Wajah' : '📸 Daftar Wajah Baru'}
          </button>
          
          {savedDescriptor && (
            <button className="lok-btn-save" onClick={() => setStep('verify')}>
              ✅ Uji Verifikasi Wajah
            </button>
          )}
          
          {savedDescriptor && (
            <button className="lok-btn-cancel" onClick={resetAll} style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}>
              🗑️ Hapus Data Wajah
            </button>
          )}
        </div>
      </div>
      
      <div className="lok-card" style={{ marginTop: '15px', backgroundColor: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#334155' }}>ℹ️ Informasi Sistem</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
          Sistem membaca 128 titik unik wajah secara lokal di perangkat (browser). Data biometrik tidak diunggah ke server sehingga 100% aman dan menjaga privasi Anda.
        </p>
      </div>
    </div>
  )

  // 📸 STEP: REGISTER
  if (step === 'register') return (
    <div className="lok-container">
      <div className="lok-header">
        <button className="lok-btn-back" onClick={() => setStep('idle')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>Daftar Wajah</h2>
      </div>
      <div className="lok-card" style={{ padding: 0, overflow: 'hidden' }}>
        <FaceScanner
          mode="register"
          onCapture={handleRegisterCapture}
          userName={user?.nama}
        />
      </div>
    </div>
  )

  // 🎉 STEP: REGISTER DONE
  if (step === 'registerDone') return (
    <div className="lok-container">
      <div className="lok-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '40px' }}>✅</div>
        <h2 style={{ fontSize: '20px', color: '#166534', margin: '0 0 10px' }}>Berhasil Didaftarkan!</h2>
        {savedPhoto && <img src={savedPhoto} alt="Foto terdaftar" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #22c55e', margin: '10px auto' }} />}
        <p style={{ color: '#475569', fontSize: '14px', marginBottom: '25px' }}>Pola wajah Anda telah tersimpan secara aman.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="lok-btn-save" onClick={() => setStep('verify')}>Uji Verifikasi</button>
          <button className="lok-btn-cancel" onClick={() => setStep('idle')}>Kembali</button>
        </div>
      </div>
    </div>
  )

  // 🔍 STEP: VERIFY
  if (step === 'verify') return (
    <div className="lok-container">
      <div className="lok-header">
        <button className="lok-btn-back" onClick={() => setStep('idle')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>Verifikasi Wajah</h2>
      </div>
      <div className="lok-card" style={{ padding: 0, overflow: 'hidden' }}>
        <FaceScanner
          mode="verify"
          referenceDescriptor={savedDescriptor}
          onCapture={handleVerifyCapture}
          onFail={handleVerifyFail}
          userName={user?.nama}
        />
      </div>
    </div>
  )

  // 📊 STEP: RESULT
  if (step === 'result') return (
    <div className="lok-container">
      <div className="lok-header">
        <button className="lok-btn-back" onClick={() => { setStep('idle'); setResult(null); setCapturedPhoto(null); setErrorMsg('') }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>Hasil Verifikasi</h2>
      </div>

      <div className="lok-card" style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '70px', height: '70px', borderRadius: '50%', 
          backgroundColor: result?.match ? '#dcfce7' : '#fee2e2', 
          margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' 
        }}>
          {result?.match ? '✅' : '❌'}
        </div>
        <h2 style={{ color: result?.match ? '#166534' : '#991b1b', margin: '0 0 20px' }}>
          {result?.match ? 'Wajah Dikenali' : 'Verifikasi Gagal'}
        </h2>

        {(savedPhoto || capturedPhoto) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px' }}>
            {savedPhoto && (
              <div>
                <img src={savedPhoto} alt="Terdaftar" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>Terdaftar</p>
              </div>
            )}
            {capturedPhoto && (
              <div>
                <img src={capturedPhoto} alt="Sekarang" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>Sekarang</p>
              </div>
            )}
          </div>
        )}

        {result && result.distance !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Tingkat Kesamaan</p>
              <strong style={{ fontSize: '18px', color: result.match ? '#22c55e' : '#ef4444' }}>{result.confidence}%</strong>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Ambang Batas</p>
              <strong style={{ fontSize: '18px', color: '#334155' }}>55%</strong>
            </div>
          </div>
        )}

        {!result?.match && errorMsg && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '20px' }}>{errorMsg}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="lok-btn-save" onClick={() => { setStep('verify'); setResult(null); setCapturedPhoto(null); setErrorMsg('') }}>
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
`;

fs.writeFileSync('src/pages/FaceTest.jsx', faceTestCode);
console.log('FaceTest.jsx updated with native UI!');
