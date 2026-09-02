import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import './Profil.css'

const ADMIN_MENUS = [
  { label: 'Rekap Presensi Harian', desc: 'Lihat absensi semua peserta', icon: '📊', to: '/admin/presensi' },
  { label: 'Kelola Peserta', desc: 'Setujui & kelola pendaftaran', icon: '👥', to: '/admin/peserta' },
  { label: 'Kelola Izin', desc: 'Tinjau pengajuan izin', icon: '📋', to: '/admin/izin' },
  { label: 'Atur Lokasi Presensi', desc: 'Tambah & edit titik lokasi', icon: '📍', to: '/admin/lokasi' },
]

export default function Profil() {
  const { user, token, logoutContext } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const isAdmin = user?.role === 'admin'

  // Fetch fresh profile data (dengan foto URL thumbnail) langsung dari server
  useEffect(() => {
    if (!user || !token) return
    api.getProfile(user.id, token)
      .then(res => { if (res.success) setProfileData(res.data) })
      .catch(() => {}) // Fallback ke user dari cache jika gagal
  }, [user, token])

  // Merge data: prioritaskan data segar dari server, fallback ke cache
  const profile = profileData ? { ...user, ...profileData } : user

  return (
    <div className="app-shell">
      {/* ── Admin Sidebar ─────────────────────────────────── */}
      {isAdmin && (
        <>
          <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
          <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="sidebar-profile">
              {profile.foto ? (
                <img src={profile.foto} alt={profile.nama} className="sidebar-avatar" style={{objectFit: 'cover', borderRadius:'50%'}} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
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
        </>
      )}

      {/* ── Page Content ──────────────────────────────────── */}
      <div className="profil-wrap">
        <div className="profil-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAdmin && (
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} title="Menu Admin">
                <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
                  <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="hamburger-badge" />
              </button>
            )}
            <h1 className="profil-title">Profil</h1>
          </div>
        </div>

        {profile && (
          <div className="profil-card">
            {profile.foto ? (
              <img src={profile.foto} alt={profile.nama} className="profil-avatar-lg" style={{objectFit: 'cover', borderRadius:'50%'}}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
            ) : null}
            <div className="profil-avatar-lg" style={{display: profile.foto ? 'none' : 'flex'}}>{profile.nama?.charAt(0).toUpperCase()}</div>
            <p className="profil-nama">{profile.nama}</p>
            <p className="profil-lokasi">{profile.lokasi || '—'}</p>
            <span className={`profil-role-badge ${isAdmin ? 'badge-admin' : 'badge-intern'}`}>
              {isAdmin ? '⚙️ Admin' : '🎓 Peserta Magang'}
            </span>
          </div>
        )}

        <div className="profil-tiles">
          <div className="profil-tile">
            <span className="profil-tile-label">ID Peserta</span>
            <span className="profil-tile-value">{profile?.id || '—'}</span>
          </div>
          <div className="profil-tile">
            <span className="profil-tile-label">Lokasi Magang</span>
            <span className="profil-tile-value">{profile?.lokasi || '—'}</span>
          </div>
        </div>

        {!isAdmin && (
          <button className="btn btn-outline"
            style={{ color: 'var(--red)', borderColor: 'var(--red)', marginTop: 8 }}
            onClick={logoutContext}>
            Keluar dari Akun
          </button>
        )}
      </div>

      <BottomNav active="profil" />
    </div>
  )
}
