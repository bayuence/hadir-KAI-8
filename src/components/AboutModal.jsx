import React from 'react'
import './AboutModal.css'

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div className="about-modal-card" onClick={e => e.stopPropagation()}>
        <button className="about-modal-close" onClick={onClose} aria-label="Tutup">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="about-modal-header">
          <div className="about-logo-badge">
            <img src="/logo-kai.png" alt="Logo KAI" className="about-logo-img" />
          </div>
          <h2 className="about-app-name">HADIR KAI 8</h2>
          <span className="about-version-badge">Versi 3.2.0 • PWA</span>
          <p className="about-app-desc">Sistem Presensi Digital Magang & Penugasan</p>
        </div>

        <div className="about-modal-body">
          <div className="about-info-group">
            <div className="about-info-item">
              <span className="about-info-icon">🏢</span>
              <div>
                <p className="about-info-label">Unit Kerja</p>
                <p className="about-info-val">PT Kereta Api Indonesia (Persero)<br />Daop 8 Surabaya — Unit Operasi</p>
              </div>
            </div>

            <div className="about-info-item">
              <span className="about-info-icon">📍</span>
              <div>
                <p className="about-info-label">Fitur Utama</p>
                <p className="about-info-val">Geofencing GPS Realtime, Foto Presensi, Multi-Stasiun Penugasan & Bot Notifikasi WA</p>
              </div>
            </div>

            <div className="about-info-item">
              <span className="about-info-icon">⚡</span>
              <div>
                <p className="about-info-label">Status Sistem</p>
                <p className="about-info-val" style={{ color: '#16a34a', fontWeight: 600 }}>● Online & Terhubung ke Server</p>
              </div>
            </div>
          </div>
        </div>

        <div className="about-modal-footer">
          <p className="about-copyright">© 2026 PT KAI Daop 8 Surabaya. Hak Cipta Dilindungi.</p>
          <button className="about-close-btn" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
