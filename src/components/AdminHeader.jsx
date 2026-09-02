import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../pages/Profil.css'

const ADMIN_MENUS = [
  { label: 'Dashboard Admin', desc: 'Ringkasan & statistik', icon: '📊', to: '/admin' },
  { label: 'Rekap Presensi Harian', desc: 'Lihat absensi semua peserta', icon: '📈', to: '/admin/presensi' },
  { label: 'Kelola Peserta', desc: 'Setujui & kelola pendaftaran', icon: '👥', to: '/admin/peserta' },
  { label: 'Kelola Izin', desc: 'Tinjau pengajuan izin', icon: '📋', to: '/admin/izin' },
]

export default function AdminHeader({ title }) {
  const { user, logoutContext } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const profile = user || {}

  return (
    <>
      {/* ── Admin Sidebar Drawer ─────────────────────────────────── */}
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="sidebar-profile">
          {profile.foto ? (
            <img src={profile.foto} alt={profile.nama} className="sidebar-avatar" style={{objectFit: 'cover', objectPosition: 'top', borderRadius:'50%'}} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
          ) : null}
          <div className="sidebar-avatar" style={{display: profile.foto ? 'none' : 'flex'}}>{profile.nama?.charAt(0).toUpperCase()}</div>
          <p className="sidebar-name">{profile.nama}</p>
          <p className="sidebar-lokasi">{profile.lokasi || '—'}</p>
          <span className="sidebar-role-badge">⚙️ Administrator</span>
        </div>
        <div className="sidebar-divider" />
        <p className="sidebar-section-title">Menu Admin</p>
        <nav className="sidebar-menu">
          {ADMIN_MENUS.map(m => (
            <button key={m.to} className="sidebar-menu-item"
              onClick={() => { setSidebarOpen(false); navigate(m.to) }}>
              <span className="sidebar-menu-icon">{m.icon}</span>
              <div className="sidebar-menu-text">
                <span className="sidebar-menu-label">{m.label}</span>
                <span className="sidebar-menu-desc">{m.desc}</span>
              </div>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14" className="sidebar-menu-arrow">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button className="sidebar-logout" onClick={logoutContext}>
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Keluar dari Akun
        </button>
      </aside>

      {/* ── Page Header dengan Hamburger Button ────────────────── */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} title="Menu Admin">
          <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="hamburger-badge" />
        </button>
        <h1 className="admin-page-title" style={{ margin: 0 }}>{title}</h1>
      </div>
    </>
  )
}
