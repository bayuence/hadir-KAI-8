import React, { useState, useEffect } from 'react'
import { isIos, isStandalone } from '../services/notificationService'
import './IosInstallPrompt.css'

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Hanya tampilkan jika user berada di iOS dan BELUM menginstal ke Home Screen
    if (isIos() && !isStandalone()) {
      const dismissed = sessionStorage.getItem('kai_ios_prompt_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }
  }, [])

  if (!showPrompt) return null

  const handleDismiss = () => {
    sessionStorage.setItem('kai_ios_prompt_dismissed', 'true')
    setShowPrompt(false)
  }

  return (
    <div className="ios-install-banner">
      <div className="ios-install-header">
        <div className="ios-install-title">
          <span className="ios-badge">📱 Pengguna iPhone</span>
          <strong>Aktifkan Fitur Notifikasi PWA</strong>
        </div>
        <button className="ios-btn-close" onClick={handleDismiss}>×</button>
      </div>

      <p className="ios-install-desc">
        Apple mewajibkan aplikasi disimpan ke <strong>Home Screen</strong> agar notifikasi pengingat presensi dapat berfungsi di iPhone:
      </p>

      <div className="ios-steps">
        <div className="ios-step-item">
          <span className="ios-step-num">1</span>
          <span>Tekan ikon <strong>Share (Bagikan)</strong> <span className="ios-icon-share">⎋</span> di bilah navigasi bawah Safari.</span>
        </div>
        <div className="ios-step-item">
          <span className="ios-step-num">2</span>
          <span>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</span>
        </div>
        <div className="ios-step-item">
          <span className="ios-step-num">3</span>
          <span>Buka aplikasi dari ikon <strong>HADIRKAI8</strong> baru di Home Screen Anda.</span>
        </div>
      </div>

      <button className="ios-btn-ack" onClick={handleDismiss}>
        Saya Mengerti
      </button>
    </div>
  )
}
