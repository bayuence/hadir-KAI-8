import React, { useState } from 'react'
import { api } from '../services/api'
import './NotificationPrompt.css'

export default function NotificationPrompt() {
  const [loadingType, setLoadingType] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handleBroadcast = async (tipe) => {
    if (loadingType) return
    const label = tipe === 'pulang' ? 'Presensi Pulang' : 'Presensi Masuk'
    
    if (!window.confirm(`Kirim broadcast pengingat "${label}" ke seluruh peserta magang via WhatsApp?`)) {
      return
    }

    setLoadingType(tipe)
    setFeedback(null)

    try {
      const res = await api.admin.broadcastPengingatWA(tipe)
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Pengingat ${label} berhasil dikirim.`
        })
      } else {
        setFeedback({
          type: 'error',
          message: res?.message || `Gagal mengirim pengingat ${label}.`
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses broadcast.'
      })
    } finally {
      setLoadingType(null)
      setTimeout(() => setFeedback(null), 6000)
    }
  }

  return (
    <div className="wa-broadcast-card">
      <div className="wa-broadcast-header">
        <div className="wa-broadcast-title-group">
          <div className="wa-broadcast-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h4 className="wa-broadcast-title">Broadcast Pengingat WA</h4>
            <p className="wa-broadcast-subtitle">Kirim pesan WhatsApp otomatis ke semua peserta magang</p>
          </div>
        </div>
        <span className="wa-broadcast-badge">Admin</span>
      </div>

      <div className="wa-broadcast-btn-group">
        <button
          type="button"
          className="wa-btn wa-btn-masuk"
          onClick={() => handleBroadcast('masuk')}
          disabled={loadingType !== null}
        >
          <div className="wa-btn-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2"/>
              <path d="M12 20v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="m17.66 17.66 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="M20 12h2"/>
              <path d="m6.34 17.66-1.41 1.41"/>
              <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
          </div>
          <div className="wa-btn-content">
            <span className="wa-btn-heading">Pengingat Masuk</span>
            <span className="wa-btn-sub">Pesan presensi pagi</span>
          </div>
          {loadingType === 'masuk' && <span className="wa-btn-spinner" />}
        </button>

        <button
          type="button"
          className="wa-btn wa-btn-pulang"
          onClick={() => handleBroadcast('pulang')}
          disabled={loadingType !== null}
        >
          <div className="wa-btn-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>
          <div className="wa-btn-content">
            <span className="wa-btn-heading">Pengingat Pulang</span>
            <span className="wa-btn-sub">Pesan presensi sore</span>
          </div>
          {loadingType === 'pulang' && <span className="wa-btn-spinner" />}
        </button>
      </div>

      {feedback && (
        <div className={`wa-alert wa-alert-${feedback.type}`}>
          <div className="wa-alert-icon">
            {feedback.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>
          <span className="wa-alert-text">{feedback.message}</span>
        </div>
      )}
    </div>
  )
}


