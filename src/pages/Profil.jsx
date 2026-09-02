import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import './Profil.css'

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

export default function Profil() {
  const { user, token, loginContext, logoutContext } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!user || !token) return
    api.getProfile(user.id, token)
      .then(res => {
        if (res.success && res.data) {
          setProfileData(res.data)
          loginContext({ ...user, ...res.data }, token)
        }
      })
      .catch(() => {})
  }, [user, token])

  // Merge: profileData override semua kecuali foto — foto tetap dari user (localStorage) jika profileData tidak punya
  const profile = profileData
    ? { ...user, ...profileData, foto: profileData.foto || user?.foto }
    : user

  return (
    <div className="app-shell">
      {/* ── Admin Sidebar Drawer ─────────────────────────────────── */}
      {isAdmin && (
        <>
          <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
          <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="sidebar-profile" onClick={() => { setSidebarOpen(false); navigate('/profil') }} style={{ cursor: 'pointer' }}>
              {profile.foto ? (
                <img src={profile.foto} alt={profile.nama} className="sidebar-avatar" style={{objectFit: 'cover', objectPosition: 'top', borderRadius:'50%'}} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
              ) : null}
              <div className="sidebar-avatar" style={{display: profile.foto ? 'none' : 'flex'}}>{profile.nama?.charAt(0).toUpperCase()}</div>
              <p className="sidebar-name">{profile.nama}</p>
              <p className="sidebar-lokasi">{profile.lokasi || '—'}</p>
              <span className="sidebar-role-badge">Administrator</span>
            </div>
            <div className="sidebar-divider" />

            {/* Menu Halaman Profil (Sebelum tulisan MENU ADMIN) */}
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
            <h1 className="profil-title">Profil Akun</h1>
          </div>
        </div>

        {profile && (
          <div className="profil-card">
            {profile.foto ? (
              <img src={profile.foto} alt={profile.nama} className="profil-avatar-lg" style={{objectFit: 'cover', objectPosition: 'top', borderRadius:'50%'}}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
            ) : null}
            <div className="profil-avatar-lg" style={{display: profile.foto ? 'none' : 'flex'}}>{profile.nama?.charAt(0).toUpperCase()}</div>
            <p className="profil-nama">{profile.nama}</p>
            <p className="profil-lokasi">{profile.lokasi || '—'}</p>
            <span className={`profil-role-badge ${isAdmin ? 'badge-admin' : 'badge-intern'}`}>
              {isAdmin ? 'Administrator' : 'Peserta Magang'}
            </span>
          </div>
        )}

        {/* Section 1: Informasi Magang & Penugasan */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Informasi Magang & Penugasan</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">ID Peserta / Magang</p>
                <p className="profil-info-val">{profile?.id || '—'}</p>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Unit Kerja</p>
                <p className="profil-info-val">{profile?.unitKerja || '—'}</p>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Lokasi Magang</p>
                <p className="profil-info-val">{profile?.lokasi || 'Belum ditetapkan'}</p>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Periode Magang</p>
                <p className="profil-info-val">
                  {profile?.mulaiMagang || '—'} {profile?.selesaiMagang ? `s.d. ${profile.selesaiMagang}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Data Pribadi & Kontak */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Informasi Pribadi & Kontak</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Tanggal Lahir (PIN Login)</p>
                <p className="profil-info-val">{profile?.tanggalLahir || profile?.tglLahir || profile?.tanggal_lahir || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">No. HP / WhatsApp</p>
                <p className="profil-info-val">{profile?.noHp || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Email</p>
                <p className="profil-info-val">{profile?.email || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Alamat Domisili</p>
                <p className="profil-info-val">{profile?.alamat || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pendidikan */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Pendidikan & Asal Instansi</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Kampus / Sekolah</p>
                <p className="profil-info-val">{profile?.kampus || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Jurusan</p>
                <p className="profil-info-val">{profile?.jurusan || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <button className="btn btn-outline"
          style={{ color: 'var(--red)', borderColor: 'var(--red)', marginTop: 8, width: '100%' }}
          onClick={logoutContext}>
          Keluar dari Akun
        </button>
      </div>

      <BottomNav active="profil" />
    </div>
  )
}
