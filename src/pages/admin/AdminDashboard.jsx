import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import BottomNavAdmin from '../../components/BottomNavAdmin'
import './Admin.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logoutContext } = useAuth()
  const [stats, setStats] = useState({ hadir: 0, izin: 0, tidakHadir: 0, pending: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    api.admin.getDashboard()
      .then(d => { if (d.success) setStats(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Hadir', value: stats.hadir, color: '#22c55e', icon: '✅' },
    { label: 'Izin', value: stats.izin, color: '#f59e0b', icon: '📋' },
    { label: 'Tidak Hadir', value: stats.tidakHadir, color: '#ef4444', icon: '❌' },
    { label: 'Menunggu', value: stats.pending, color: '#6366f1', icon: '⏳' },
  ]

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        {/* Header */}
        <div className="admin-header">
          <div>
            <p className="admin-greeting">Halo Admin, {user?.nama?.split(' ')[0]} 👋</p>
            <p className="admin-date">{today}</p>
          </div>
          <button className="admin-logout-btn" onClick={logoutContext} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Total badge */}
        <div className="admin-total-badge">
          <span>Total Peserta Aktif</span>
          <strong>{loading ? '...' : stats.total} orang</strong>
        </div>

        {/* Stat Cards */}
        <div className="admin-stat-grid">
          {statCards.map(s => (
            <div className="admin-stat-card" key={s.label} style={{ '--accent': s.color }}>
              <span className="admin-stat-icon">{s.icon}</span>
              <span className="admin-stat-value">{loading ? '-' : s.value}</span>
              <span className="admin-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {!loading && stats.total > 0 && (
          <div className="admin-attendance-bar">
            <div className="admin-bar-label">
              <span>Kehadiran Hari Ini</span>
              <span>{Math.round((stats.hadir / stats.total) * 100)}%</span>
            </div>
            <div className="admin-bar-track">
              <div className="admin-bar-fill" style={{ width: `${(stats.hadir / stats.total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="admin-quick-actions">
          <button className="admin-action-card" onClick={() => navigate('/admin/peserta')}>
            <div className="admin-action-icon" style={{ background: '#dbeafe' }}>👥</div>
            <span>Kelola Peserta</span>
            {stats.pending > 0 && <span className="admin-badge-notif">{stats.pending}</span>}
          </button>
          <button className="admin-action-card" onClick={() => navigate('/admin/presensi')}>
            <div className="admin-action-icon" style={{ background: '#dcfce7' }}>📊</div>
            <span>Rekap Presensi</span>
          </button>
          <button className="admin-action-card" onClick={() => navigate('/admin/izin')}>
            <div className="admin-action-icon" style={{ background: '#fef9c3' }}>📋</div>
            <span>Kelola Izin</span>
          </button>
          <button className="admin-action-card" onClick={() => navigate('/admin/lokasi')}>
            <div className="admin-action-icon" style={{ background: '#ede9fe' }}>📍</div>
            <span>Atur Lokasi</span>
          </button>
        </div>
      </div>
      <BottomNavAdmin active="home" />
    </div>
  )
}
