import React, { useRef, useState, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'
import './FaceScanner.css'

/**
 * FaceScanner Component
 * Props:
 *   mode: 'register' | 'verify'
 *   referenceDescriptor: Float32Array (wajah terdaftar, untuk mode verify)
 *   onCapture(descriptor, photoBase64): callback ketika scan berhasil
 *   onFail(reason): callback ketika verifikasi gagal
 *   userName: string — untuk tampilan hasil
 */
export default function FaceScanner({ mode = 'verify', referenceDescriptor, onCapture, onFail, userName = '' }) {
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const [status, setStatus] = useState('scanning') // scanning | detected | matched | failed | captured
  const [confidence, setConfidence] = useState(null)
  const [distance, setDistance] = useState(null)
  const [facingMode] = useState('user')

  const MATCH_THRESHOLD = 0.45

  const compareDescriptors = (d1, d2) => {
    if (!d1 || !d2) return { match: false, distance: 1 }
    const dist = faceapi.euclideanDistance(d1, d2)
    return { match: dist < MATCH_THRESHOLD, distance: parseFloat(dist.toFixed(3)) }
  }

  const scan = useCallback(async () => {
    const video = webcamRef.current?.video
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    try {
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      faceapi.matchDimensions(canvas, displaySize)

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45, inputSize: 320 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!detection) {
        setStatus('scanning')
        setConfidence(null)
        return
      }

      // Gambar landmark wajah di canvas overlay
      const resized = faceapi.resizeResults(detection, displaySize)
      faceapi.draw.drawFaceLandmarks(canvas, resized)

      if (mode === 'register') {
        // Mode daftar: cukup deteksi wajah
        setStatus('detected')
        setConfidence(Math.round(detection.detection.score * 100))
      } else {
        // Mode verify: bandingkan dengan descriptor referensi
        if (!referenceDescriptor) { setStatus('scanning'); return }
        const result = compareDescriptors(detection.descriptor, referenceDescriptor)
        const conf = Math.round((1 - result.distance) * 100)
        setDistance(result.distance)
        setConfidence(Math.max(0, conf))
        setStatus(result.match ? 'matched' : 'detected')
      }
    } catch (e) {
      // silent
    }
  }, [mode, referenceDescriptor])

  useEffect(() => {
    intervalRef.current = setInterval(scan, 200)
    return () => clearInterval(intervalRef.current)
  }, [scan])

  const handleCapture = useCallback(async () => {
    clearInterval(intervalRef.current)
    const video = webcamRef.current?.video
    const screenshot = webcamRef.current?.getScreenshot()
    if (!video || !screenshot) return

    // Kompres foto
    const compressPhoto = (dataUrl) => new Promise((res) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 640
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        res(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = dataUrl
    })

    const compressed = await compressPhoto(screenshot)

    // Ambil descriptor dari frame video
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      setStatus('failed')
      onFail && onFail('Wajah tidak terdeteksi saat pengambilan foto.')
      return
    }

    setStatus('captured')
    onCapture && onCapture(detection.descriptor, compressed)
  }, [onCapture, onFail])

  const handleVerifyCapture = useCallback(async () => {
    clearInterval(intervalRef.current)
    const video = webcamRef.current?.video
    const screenshot = webcamRef.current?.getScreenshot()
    if (!video || !screenshot || !referenceDescriptor) return

    const compressPhoto = (dataUrl) => new Promise((res) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 640
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        res(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = dataUrl
    })

    const compressed = await compressPhoto(screenshot)

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      setStatus('failed')
      onFail && onFail('Wajah tidak terdeteksi. Pastikan pencahayaan cukup.')
      return
    }

    const result = compareDescriptors(detection.descriptor, referenceDescriptor)
    if (result.match) {
      setStatus('captured')
      onCapture && onCapture(detection.descriptor, compressed, result)
    } else {
      setStatus('failed')
      onFail && onFail(`Wajah tidak cocok (jarak: ${result.distance}). Pastikan Anda adalah peserta yang terdaftar.`)
    }
  }, [referenceDescriptor, onCapture, onFail])

  const statusConfig = {
    scanning:  { color: '#94a3b8', label: 'Mencari wajah...', ring: 'ring-grey' },
    detected:  { color: '#f59e0b', label: mode === 'register' ? 'Wajah terdeteksi! Siap ambil foto.' : 'Wajah terdeteksi, cocokkan...', ring: 'ring-amber' },
    matched:   { color: '#22c55e', label: `✓ Wajah dikenali! Tekan konfirmasi.`, ring: 'ring-green' },
    failed:    { color: '#ef4444', label: 'Verifikasi gagal. Coba lagi.', ring: 'ring-red' },
    captured:  { color: '#3b82f6', label: 'Berhasil!', ring: 'ring-blue' },
  }
  const cfg = statusConfig[status] || statusConfig.scanning

  const canConfirm = mode === 'register' ? status === 'detected' : status === 'matched'

  return (
    <div className="face-scanner">
      {/* Webcam + Canvas overlay */}
      <div className={`face-cam-wrap ${cfg.ring}`}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode, width: 480, height: 480 }}
          mirrored={true}
          className="face-cam-video"
        />
        <canvas ref={canvasRef} className="face-cam-canvas" />

        {/* Oval frame guide */}
        <div className="face-oval-frame">
          <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="110" rx="80" ry="95"
              stroke={cfg.color}
              strokeWidth="3"
              strokeDasharray={status === 'scanning' ? '8 6' : 'none'}
              fill="none"
            />
          </svg>
        </div>

        {/* Status pill */}
        <div className="face-status-pill" style={{ background: cfg.color + '22', border: `1px solid ${cfg.color}55`, color: cfg.color }}>
          {cfg.label}
        </div>

        {/* Confidence meter */}
        {confidence !== null && (
          <div className="face-confidence">
            <div className="face-conf-bar">
              <div className="face-conf-fill" style={{ width: `${confidence}%`, background: cfg.color }} />
            </div>
            <span style={{ color: cfg.color }}>{confidence}% {mode === 'verify' && distance !== null ? `(jarak: ${distance})` : ''}</span>
          </div>
        )}

        {/* Nama peserta saat matched */}
        {status === 'matched' && userName && (
          <div className="face-name-badge">
            <span>👤 {userName}</span>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="face-actions">
        {canConfirm && (
          <button
            className="face-confirm-btn"
            style={{ background: cfg.color }}
            onClick={mode === 'register' ? handleCapture : handleVerifyCapture}
          >
            {mode === 'register' ? '📸 Ambil & Simpan Wajah' : '✅ Konfirmasi Presensi'}
          </button>
        )}
        {status === 'failed' && (
          <button className="face-retry-btn" onClick={() => { setStatus('scanning'); setConfidence(null); intervalRef.current = setInterval(scan, 200) }}>
            🔄 Coba Lagi
          </button>
        )}
      </div>
    </div>
  )
}
