import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_MENUS = [
  {
    label: 'Dashboard Admin',
    desc: 'Ringkasan & statistik',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
    ),
    to: '/admin'
  },
  {
    label: 'Rekap Presensi Harian',
    desc: 'Lihat absensi semua peserta',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    to: '/admin/presensi'
  },
  {
    label: 'Kelola Peserta',
    desc: 'Setujui & kelola pendaftaran',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      </svg>
    ),
    to: '/admin/peserta'
  },
  {
    label: 'Kelola Izin',
    desc: 'Tinjau pengajuan izin',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
    to: '/admin/izin'
  },
  {
    label: 'Unit Kerja & Penempatan',
    desc: 'Atur koordinat & radius lokasi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    to: '/admin/lokasi'
  },
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
        <div className="sidebar-profile" onClick={() => { setSidebarOpen(false); navigate('/profil') }} style={{ cursor: 'pointer' }} title="Buka Halaman Profil">
          {profile.foto ? (
            <img src={profile.foto} alt={profile.nama} className="sidebar-avatar" style={{objectFit: 'cover', objectPosition: 'top', borderRadius:'50%'}} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
          ) : null}
          <div className="sidebar-avatar" style={{display: profile.foto ? 'none' : 'flex'}}>{profile.nama?.charAt(0).toUpperCase()}</div>
          <p className="sidebar-name">{profile.nama}</p>
          <p className="sidebar-lokasi">{profile.lokasi || '—'}</p>
          <span className="sidebar-role-badge">Administrator</span>
        </div>
        <div className="sidebar-divider" />

        {/* ── Menu Profil (Sebelum label MENU ADMIN) ── */}
        <nav className="sidebar-menu" style={{ marginBottom: 12 }}>
          <button className="sidebar-menu-item" onClick={() => { setSidebarOpen(false); navigate('/profil') }}>
            <span className="sidebar-menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <div className="sidebar-menu-text">
              <span className="sidebar-menu-label">Halaman Profil</span>
              <span className="sidebar-menu-desc">Lihat data profil & akun</span>
            </div>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14" className="sidebar-menu-arrow">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </nav>

        <p className="sidebar-section-title">MENU ADMIN</p>
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
