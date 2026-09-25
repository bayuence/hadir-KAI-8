import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import AdminHeader from '../../components/AdminHeader'
import BottomNav from '../../components/BottomNav'
import './Admin.css'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ hadir: 0, izin: 0, tidakHadir: 0, pending: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    api.admin.getDashboard()
      .then(d => {
        if (d && d.success) setStats(d.data)
        else setError(d?.message || 'Gagal memuat data dashboard.')
      })
      .catch(() => setError('Tidak dapat terhubung ke server.'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const rate = stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0

  const STAT_CARDS = [
    { key: 'hadir',       label: 'Hadir',       tone: 'green', value: stats.hadir,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { key: 'izin',        label: 'Izin',        tone: 'amber', value: stats.izin,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { key: 'tidakHadir',  label: 'Tidak Hadir', tone: 'red',   value: stats.tidakHadir,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
    { key: 'pending',     label: 'Menunggu',    tone: 'blue',  value: stats.pending,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg> },
  ]

  const MENUS = [
    { label: 'Rekap Presensi', desc: 'Lihat absensi semua peserta', to: '/admin/presensi', tone: 'blue',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { label: 'Kelola Peserta', desc: 'Setujui & kelola pendaftaran', to: '/admin/peserta', tone: 'emerald', badge: stats.pending,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: 'Kelola Izin', desc: 'Tinjau pengajuan izin', to: '/admin/izin', tone: 'amber',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
    { label: 'Unit Kerja & Lokasi', desc: 'Atur koordinat & radius lokasi', to: '/admin/lokasi', tone: 'violet',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
  ]

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title={`Halo, ${user?.nama?.split(' ')[0] || 'Admin'}`} subtitle={today} />

        {/* ── Hero Card ── */}
        <div className="adb-hero">
          <div className="adb-hero-top">
            <div>
              <div className="adb-hero-label">Tingkat Kehadiran Hari Ini</div>
              <div className="adb-hero-value">
                {loading
                  ? <span className="adb-hero-skeleton" />
                  : <>{rate}<span className="adb-hero-unit">%</span></>}
              </div>
            </div>
            <button
              className={`adb-refresh${refreshing ? ' spinning' : ''}`}
              onClick={() => load(true)}
              disabled={refreshing || loading}
              aria-label="Muat ulang data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          <div className="adb-hero-bar">
            <div className="adb-hero-bar-head">
              <span>{stats.hadir} dari {stats.total} peserta hadir</span>
              <strong>{loading ? '-' : `${rate}%`}</strong>
            </div>
            <div className="adb-hero-track">
              <div className="adb-hero-fill" style={{ width: `${loading ? 0 : rate}%` }} />
            </div>
          </div>
          <div className="adb-hero-date">{today}</div>
        </div>

        {/* ── Error ── */}
        {error && !loading && (
          <div className="adb-error">
            <div className="adb-error-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="adb-error-title">Data gagal dimuat</div>
            <div className="adb-error-msg">{error}</div>
            <button className="adb-error-btn" onClick={() => load(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Coba lagi
            </button>
          </div>
        )}

        {!error && (
          <>
            {/* ── Statistik ── */}
            <div className="adb-section-label">Statistik Hari Ini</div>
            <div className="adb-stat-grid">
              {STAT_CARDS.map(s => (
                <div className={`adb-stat adb-stat--${s.tone}`} key={s.key}>
                  <span className="adb-stat-icon">{s.icon}</span>
                  <span className="adb-stat-value">
                    {loading ? <span className="adb-skeleton-line" /> : s.value}
                  </span>
                  <span className="adb-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── Menu Admin ── */}
            <div className="adb-section-label">Menu Admin</div>
            <div className="adb-menu-grid">
              {MENUS.map(m => (
                <button className={`adb-menu adb-menu--${m.tone}`} key={m.to} onClick={() => navigate(m.to)}>
                  <span className="adb-menu-icon">{m.icon}</span>
                  <span className="adb-menu-body">
                    <span className="adb-menu-label">{m.label}</span>
                    <span className="adb-menu-desc">{m.desc}</span>
                  </span>
                  {m.badge > 0 && <span className="adb-menu-badge">{m.badge}</span>}
                  <span className="adb-menu-chevron">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav active="profil" />
    </div>
  )
}
