import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import AdminHeader from '../../components/AdminHeader'
import BottomNav from '../../components/BottomNav'
import './Admin.css'

export default function AdminDashboard() {
  const { user } = useAuth()
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
    {
      label: 'Hadir', value: stats.hadir, color: '#22c55e', bg: '#f0fdf4',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )
    },
    {
      label: 'Izin', value: stats.izin, color: '#f59e0b', bg: '#fffbeb',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      )
    },
    {
      label: 'Tidak Hadir', value: stats.tidakHadir, color: '#ef4444', bg: '#fef2f2',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      )
    },
    {
      label: 'Menunggu', value: stats.pending, color: '#6366f1', bg: '#eef2ff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    },
  ]

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title={`Halo, ${user?.nama?.split(' ')[0] || 'Admin'}`} subtitle={today} />

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
      </div>
      <BottomNav active="profil" />
    </div>
  )
}
