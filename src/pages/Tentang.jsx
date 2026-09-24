import React from 'react'
import { useAuth } from '../context/AuthContext'
import AdminHeader from '../components/AdminHeader'
import BottomNav from '../components/BottomNav'
import './Tentang.css'

export default function Tentang() {
  return (
    <div className="app-shell tentang-page">
      {/* Header: Menggunakan AdminHeader (Hamburger Menu) untuk semua pengguna */}
      <div style={{ padding: '20px 20px 0' }}>
        <AdminHeader title="Tentang Aplikasi" />
      </div>

      <div className="tentang-content">
        {/* Brand Banner Card */}
        <div className="tentang-brand-card">
          <div className="tentang-logo-badge">
            <img src="/logo-kai.png" alt="Logo KAI" className="tentang-logo-img" />
          </div>
          <h2 className="tentang-app-name">HADIR KAI 8</h2>
          <div className="tentang-badges-row">
            <span className="tentang-badge primary">Versi 3.2.0</span>
            <span className="tentang-badge secondary">PWA Ready</span>
          </div>
          <p className="tentang-app-subtitle">Sistem Presensi Digital & Manajemen Penugasan Magang</p>
        </div>

        {/* Developer / Pembuat Aplikasi Section */}
        <div className="tentang-section">
          <h3 className="tentang-section-title">Pembuat Aplikasi</h3>
          <div className="tentang-dev-card">
            <div className="tentang-dev-info">
              <div className="tentang-dev-avatar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <p className="tentang-dev-label">Developer</p>
                <h4 className="tentang-dev-name">ence</h4>
              </div>
            </div>

            <div className="tentang-social-links">
              <a
                href="https://wa.me/6282273952703"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn whatsapp"
                title="Hubungi WhatsApp (082273952703)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/bayuence_"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn instagram"
                title="Kunjungi Instagram (@bayuence_)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="tentang-section">
          <h3 className="tentang-section-title">Informasi Sistem</h3>

          <div className="tentang-info-card">
            <div className="tentang-info-item">
              <div className="tentang-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                  <path d="M9 22v-4h6v4"/>
                  <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
                  <path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/>
                  <path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>
                </svg>
              </div>
              <div>
                <p className="tentang-info-label">Unit Kerja / Instansi</p>
                <p className="tentang-info-val">PT Kereta Api Indonesia (Persero)</p>
                <p className="tentang-info-sub">Daerah Operasi 8 Surabaya — Unit Operasi</p>
              </div>
            </div>

            <div className="tentang-info-item">
              <div className="tentang-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <p className="tentang-info-label">Teknologi Presensi</p>
                <p className="tentang-info-val">Geofencing GPS Realtime & Verifikasi Biometrik Foto</p>
              </div>
            </div>

            <div className="tentang-info-item">
              <div className="tentang-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div>
                <p className="tentang-info-label">Status Server</p>
                <p className="tentang-info-val status-online">● Server Google Apps Script Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Card */}
        <div className="tentang-section">
          <h3 className="tentang-section-title">Fitur Utama</h3>
          <div className="tentang-features-grid">
            <div className="feature-chip">
              <span className="chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </span>
              <span>Presensi GPS Multi-Stasiun</span>
            </div>
            <div className="feature-chip">
              <span className="chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <span>Kamera Biometrik Live</span>
            </div>
            <div className="feature-chip">
              <span className="chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span>Bot Pengingat WhatsApp</span>
            </div>
            <div className="feature-chip">
              <span className="chip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </span>
              <span>Rekapitulasi Harian & PDF</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="tentang-footer-card">
          <p className="tentang-copyright">
            © 2026 PT Kereta Api Indonesia (Persero) Daop 8 Surabaya.<br />Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
