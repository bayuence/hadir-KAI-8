import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FaceScanner from '../components/FaceScanner'
import { useFaceRecognition } from '../hooks/useFaceRecognition'
import { useAuth } from '../context/AuthContext'
import './FaceTest.css'

/**
 * FaceTest — Halaman uji coba sistem face recognition
 * Alur:
 *   1. Load model AI
 *   2. Daftar wajah (register) → simpan descriptor ke localStorage
 *   3. Verifikasi wajah (verify) → cocokkan dengan descriptor tersimpan
 */
export default function FaceTest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { modelReady, loadingModel, modelError, loadModels, serializeDescriptor, deserializeDescriptor } = useFaceRecognition()

  const [step, setStep] = useState('idle') // idle | register | verify | result
  const [savedDescriptor, setSavedDescriptor] = useState(null)
  const [savedPhoto, setSavedPhoto] = useState(null)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [result, setResult] = useState(null) // { match, distance, confidence }
  const [errorMsg, setErrorMsg] = useState('')

  // Coba load descriptor dari localStorage (jika sudah pernah daftar)
  useEffect(() => {
    const stored = localStorage.getItem('kai_face_descriptor')
    const storedPhoto = localStorage.getItem('kai_face_photo')
    if (stored) {
      const desc = deserializeDescriptor(stored)
      if (desc) { setSavedDescriptor(desc); setSavedPhoto(storedPhoto) }
    }
  }, [deserializeDescriptor])

  // Load model saat pertama masuk
  useEffect(() => {
    loadModels()
  }, [loadModels])

  // ── REGISTER: Simpan descriptor + foto ──────────────────────
  const handleRegisterCapture = (descriptor, photo) => {
    const serialized = serializeDescriptor(descriptor)
    localStorage.setItem('kai_face_descriptor', serialized)
    localStorage.setItem('kai_face_photo', photo)
    setSavedDescriptor(descriptor)
    setSavedPhoto(photo)
    setStep('registerDone')
  }

  // ── VERIFY: Cocokkan dan tampilkan hasil ─────────────────────
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

  // ── UI Loading Model ─────────────────────────────────────────
  if (loadingModel) return (
    <div className="facetest-shell">
      <div className="facetest-loading">
        <div className="facetest-ai-icon">🧠</div>
        <h3>Memuat Model AI...</h3>
        <p>Face Recognition Neural Network sedang dimuat.<br/>Proses ini hanya terjadi sekali.</p>
        <div className="facetest-spinner" />
      </div>
    </div>
  )

  if (modelError) return (
    <div className="facetest-shell">
      <div className="facetest-error-card">
        <div className="facetest-ai-icon">⚠️</div>
        <h3>Gagal Memuat Model</h3>
        <p>{modelError}</p>
        <button className="facetest-btn-primary" onClick={loadModels}>Coba Lagi</button>
      </div>
    </div>
  )

  // ── STEP: IDLE ───────────────────────────────────────────────
  if (step === 'idle') return (
    <div className="facetest-shell">
      <div className="facetest-header">
        <button className="facetest-back" onClick={() => navigate(-1)}>← Kembali</button>
        <h2>🧠 Face Recognition Test</h2>
        <p className="facetest-subtitle">Uji sistem pengenalan wajah berbasis AI</p>
      </div>

      <div className="facetest-model-badge">
        <span className="badge-dot" />
        Model AI siap · TinyFaceDetector + ResNet
      </div>

      {savedDescriptor ? (
        <div className="facetest-registered-card">
          <div className="facetest-reg-label">✅ Wajah Terdaftar</div>
          {savedPhoto && <img src={savedPhoto} alt="Wajah terdaftar" className="facetest-reg-photo" />}
          <p>Wajah <strong>{user?.nama || 'Peserta'}</strong> sudah terdaftar.<br/>Siap untuk diverifikasi.</p>
        </div>
      ) : (
        <div className="facetest-empty-card">
          <div style={{ fontSize: 48 }}>👤</div>
          <p>Belum ada wajah terdaftar.<br/>Daftar terlebih dahulu.</p>
        </div>
      )}

      <div className="facetest-actions">
        <button className="facetest-btn-register" onClick={() => setStep('register')}>
          📸 {savedDescriptor ? 'Daftar Ulang Wajah' : 'Daftar Wajah'}
        </button>
        {savedDescriptor && (
          <button className="facetest-btn-primary" onClick={() => setStep('verify')}>
            🔍 Verifikasi Wajah
          </button>
        )}
        {savedDescriptor && (
          <button className="facetest-btn-ghost" onClick={resetAll}>
            🗑️ Reset Data Wajah
          </button>
        )}
      </div>

      <div className="facetest-info-box">
        <h4>📊 Cara Kerja (Machine Learning)</h4>
        <ul>
          <li><strong>Daftar:</strong> Kamera scan wajah → Neural Net ekstrak 128 angka unik (face descriptor)</li>
          <li><strong>Verifikasi:</strong> Scan ulang → descriptor baru dibandingkan → jika jarak &lt; 0.45 = cocok ✅</li>
          <li><strong>Privacy:</strong> Semua proses berjalan di browser, tidak dikirim ke server manapun</li>
        </ul>
      </div>
    </div>
  )

  // ── STEP: REGISTER ───────────────────────────────────────────
  if (step === 'register') return (
    <div className="facetest-shell">
      <div className="facetest-header">
        <button className="facetest-back" onClick={() => setStep('idle')}>← Batal</button>
        <h2>📸 Daftar Wajah</h2>
        <p className="facetest-subtitle">Posisikan wajah di dalam oval, tunggu terdeteksi lalu ambil foto</p>
      </div>
      <FaceScanner
        mode="register"
        onCapture={handleRegisterCapture}
        userName={user?.nama}
      />
    </div>
  )

  // ── STEP: REGISTER DONE ──────────────────────────────────────
  if (step === 'registerDone') return (
    <div className="facetest-shell">
      <div className="facetest-result-card success">
        <div style={{ fontSize: 64 }}>✅</div>
        <h2>Wajah Berhasil Didaftarkan!</h2>
        {savedPhoto && <img src={savedPhoto} alt="Foto terdaftar" className="facetest-result-photo" />}
        <p>128 angka unik wajah Anda telah tersimpan.<br/>Sekarang coba verifikasi!</p>
        <div className="facetest-actions">
          <button className="facetest-btn-primary" onClick={() => setStep('verify')}>
            🔍 Coba Verifikasi Sekarang
          </button>
          <button className="facetest-btn-ghost" onClick={() => setStep('idle')}>
            Ke Menu Utama
          </button>
        </div>
      </div>
    </div>
  )

  // ── STEP: VERIFY ─────────────────────────────────────────────
  if (step === 'verify') return (
    <div className="facetest-shell">
      <div className="facetest-header">
        <button className="facetest-back" onClick={() => setStep('idle')}>← Batal</button>
        <h2>🔍 Verifikasi Wajah</h2>
        <p className="facetest-subtitle">Sistem akan mencocokkan wajah Anda dengan data yang terdaftar</p>
      </div>
      <FaceScanner
        mode="verify"
        referenceDescriptor={savedDescriptor}
        onCapture={handleVerifyCapture}
        onFail={handleVerifyFail}
        userName={user?.nama}
      />
    </div>
  )

  // ── STEP: RESULT ─────────────────────────────────────────────
  if (step === 'result') return (
    <div className="facetest-shell">
      <div className={`facetest-result-card ${result?.match ? 'success' : 'failed'}`}>
        <div style={{ fontSize: 64 }}>{result?.match ? '✅' : '❌'}</div>
        <h2>{result?.match ? 'Wajah Dikenali!' : 'Verifikasi Gagal'}</h2>

        {/* Foto-foto perbandingan */}
        {(savedPhoto || capturedPhoto) && (
          <div className="facetest-compare">
            {savedPhoto && (
              <div className="facetest-compare-item">
                <img src={savedPhoto} alt="Terdaftar" />
                <span>Terdaftar</span>
              </div>
            )}
            {capturedPhoto && (
              <div className="facetest-compare-item">
                <img src={capturedPhoto} alt="Sekarang" />
                <span>Sekarang</span>
              </div>
            )}
          </div>
        )}

        {/* Metrik */}
        {result && result.distance !== undefined && (
          <div className="facetest-metrics">
            <div className="metric">
              <label>Jarak (euclidean)</label>
              <strong style={{ color: result.match ? '#22c55e' : '#ef4444' }}>{result.distance}</strong>
            </div>
            <div className="metric">
              <label>Kesamaan</label>
              <strong style={{ color: result.match ? '#22c55e' : '#ef4444' }}>{result.confidence}%</strong>
            </div>
            <div className="metric">
              <label>Threshold</label>
              <strong>0.45</strong>
            </div>
          </div>
        )}

        {!result?.match && errorMsg && <p className="facetest-error-msg">{errorMsg}</p>}

        <div className="facetest-actions">
          <button className="facetest-btn-primary" onClick={() => { setStep('verify'); setResult(null); setCapturedPhoto(null); setErrorMsg('') }}>
            🔄 Coba Lagi
          </button>
          <button className="facetest-btn-ghost" onClick={() => { setStep('idle'); setResult(null); setCapturedPhoto(null); setErrorMsg('') }}>
            Ke Menu Utama
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
