import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatTanggal, formatTime, hitungDurasi } from '../utils/date'
import BottomNav from '../components/BottomNav'
import LocationBanner from '../components/LocationBanner'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [status, setStatus] = useState({ sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null })
  const [loading, setLoading] = useState(true)
  const [jam, setJam] = useState(new Date().toLocaleTimeString('id-ID', { hour12: false }))

  useEffect(() => {
    const t = setInterval(() => setJam(new Date().toLocaleTimeString('id-ID', { hour12: false })), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (user) {
      api.getStatusHariIni(user.id, token)
        .then(d => { if (d.success) setStatus(d.data) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user, token])

  const durasi = hitungDurasi(status.jamMasuk, status.jamPulang)

  const statusLabel = () => {
    if (status.sudahPulang) return { text: 'Sudah Pulang', cls: 'badge-green' }
    if (status.sudahMasuk) return { text: 'Sudah Masuk', cls: 'badge-amber' }
    return { text: 'Belum Presensi', cls: 'badge-red' }
  }

  if (loading || !user) return (
    <div className="app-shell">
      <div className="dashboard-skeleton">
        <div className="skeleton-line w60" />
        <div className="skeleton-line w40" />
        <div className="skeleton-card" />
        <div className="skeleton-btn" />
      </div>
    </div>
  )

  const sl = statusLabel()

  return (
    <div className="app-shell">
      <div className="dashboard-wrap">
        <div className="dash-header animate-fade-in">
          <div>
            <p className="dash-greeting">Halo, {user.nama.split(' ')[0]}</p>
            <p className="dash-date">{formatTanggal()}</p>
          </div>
          <div onClick={() => navigate('/profil')} style={{ cursor: 'pointer' }}>
            {user.foto ? (
              <img src={user.foto} alt={user.nama} className="dash-avatar" style={{objectFit: 'cover', objectPosition: 'top'}}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
            ) : null}
            <div className="dash-avatar" style={{display: user.foto ? 'none' : 'flex'}}>
              {user.nama.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="dash-location animate-fade-in">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M8 2C5.8 2 4 3.8 4 6c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" fill="currentColor"/>
            <circle cx="8" cy="6" r="1.5" fill="white"/>
          </svg>
          {user.lokasi || 'Lokasi tidak ditetapkan'}
        </div>

        <LocationBanner />

        <div className="dash-clock animate-fade-up">{jam}</div>

        <div className="card dash-status-card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <span className="dash-status-title">Status Hari Ini</span>
            <span className={`badge ${sl.cls}`}>{sl.text}</span>
          </div>
          <div className="dash-time-row">
            <div className="dash-time-item">
              <div className="dash-time-dot dot-green" />
              <div>
                <p className="dash-time-label">Masuk</p>
                <p className="dash-time-value">{formatTime(status.jamMasuk)}</p>
              </div>
            </div>
            <div className="dash-time-divider" />
            <div className="dash-time-item">
              <div className="dash-time-dot dot-red" />
              <div>
                <p className="dash-time-label">Pulang</p>
                <p className="dash-time-value">{formatTime(status.jamPulang)}</p>
              </div>
            </div>
            <div className="dash-time-divider" />
            <div className="dash-time-item">
              <div className="dash-time-dot dot-grey" />
              <div>
                <p className="dash-time-label">Total</p>
                <p className="dash-time-value">{durasi || '--'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-actions animate-fade-up">
          <button className="btn btn-success" disabled={status.sudahMasuk} onClick={() => navigate('/presensi/masuk')}>
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {status.sudahMasuk ? 'Sudah Presensi Masuk' : 'Presensi Masuk'}
          </button>
          <button className="btn btn-outline" style={{ color: status.sudahMasuk && !status.sudahPulang ? 'var(--red)' : undefined, borderColor: status.sudahMasuk && !status.sudahPulang ? 'var(--red)' : undefined }} disabled={!status.sudahMasuk || status.sudahPulang} onClick={() => navigate('/presensi/pulang')}>
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <path d="M12 4l-7 6 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {status.sudahPulang ? 'Sudah Presensi Pulang' : 'Presensi Pulang'}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/izin')}>
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Ajukan Izin
          </button>
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  )
}
