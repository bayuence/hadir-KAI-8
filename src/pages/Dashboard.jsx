import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatTanggal, formatTime, hitungDurasi } from '../utils/date'
import { useGeo } from '../hooks/useGeo'
import BottomNav from '../components/BottomNav'
import LocationBanner from '../components/LocationBanner'
import Avatar from '../components/Avatar'
import NotificationPrompt from '../components/NotificationPrompt'
import IosInstallPrompt from '../components/IosInstallPrompt'
import {
  checkAutomatedReminders,
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification
} from '../services/notificationService'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const geo = useGeo(user?.lat, user?.long, user?.radius || 100)

  // Status dimuat instan dari cache localStorage (0 detik)
  const [status, setStatus] = useState(() => {
    if (user?.id) {
      try {
        const cached = localStorage.getItem(`kai_status_${user.id}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          const today = new Date().toISOString().slice(0, 10)
          if (parsed.date === today && parsed.data) {
            return parsed.data
          }
        }
      } catch (_) {}
    }
    return { sudahMasuk: false, sudahPulang: false, jamMasuk: null, jamPulang: null }
  })

  const [jam, setJam] = useState(new Date().toLocaleTimeString('id-ID', { hour12: false }))
  const [runtime, setRuntime] = useState('00:00:00')

  useEffect(() => {
    const t = setInterval(() => setJam(new Date().toLocaleTimeString('id-ID', { hour12: false })), 1000)
    return () => clearInterval(t)
  }, [])

  // Live runtime: hitung dari jamMasuk sampai sekarang (atau jamPulang jika sudah checkout)
  useEffect(() => {
    if (!status.sudahMasuk || !status.jamMasuk) return

    const hitungRuntime = () => {
      const parseJam = (str) => {
        if (!str) return null
        // Format HH:MM:SS dari backend
        if (typeof str === 'string' && str.includes(':') && str.length <= 8) {
          const now = new Date()
          const [h, m, s] = str.split(':').map(Number)
          return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s || 0)
        }
        return new Date(str)
      }

      const masuk = parseJam(status.jamMasuk)
      if (!masuk) return
      const selesai = status.sudahPulang ? parseJam(status.jamPulang) : new Date()
      if (!selesai) return

      const diffMs = Math.max(0, selesai - masuk)
      const totalDetik = Math.floor(diffMs / 1000)
      const jam = Math.floor(totalDetik / 3600)
      const menit = Math.floor((totalDetik % 3600) / 60)
      const detik = totalDetik % 60
      setRuntime(
        `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`
      )
    }

    hitungRuntime()
    // Jika belum pulang, update setiap detik; jika sudah pulang, hitung sekali saja
    if (!status.sudahPulang) {
      const interval = setInterval(hitungRuntime, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  // Sinkronisasi status presensi hari ini (background sync tanpa spinner)
  const refreshStatus = useCallback(() => {
    if (!user?.id || !token) return
    api.getStatusHariIni(user.id, token)
      .then(d => {
        if (d.success && d.data) {
          setStatus(d.data)
          try {
            const today = new Date().toISOString().slice(0, 10)
            localStorage.setItem(`kai_status_${user.id}`, JSON.stringify({ date: today, data: d.data }))
          } catch (_) {}
        }
      })
      .catch(() => {})
  }, [user?.id, token])

  useEffect(() => {
    refreshStatus()

    // Auto-sync otomatis saat berpindah aplikasi / membuka PWA di HP dari PC
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus()
      }
    }
    window.addEventListener('visibilitychange', handleSync)
    window.addEventListener('focus', refreshStatus)
    window.addEventListener('pageshow', refreshStatus)

    return () => {
      window.removeEventListener('visibilitychange', handleSync)
      window.removeEventListener('focus', refreshStatus)
      window.removeEventListener('pageshow', refreshStatus)
    }
  }, [refreshStatus])

  // Pengecekan otomatis berkala jadwal presensi magang KAI Daop 8
  useEffect(() => {
    checkAutomatedReminders(status)
    const interval = setInterval(() => {
      checkAutomatedReminders(status)
    }, 30000)
    return () => clearInterval(interval)
  }, [status])

  // State sinkronisasi status izin notifikasi
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission())

  useEffect(() => {
    const updatePerm = () => setNotifPermission(getNotificationPermission())
    window.addEventListener('focus', updatePerm)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') updatePerm()
    })
    return () => {
      window.removeEventListener('focus', updatePerm)
    }
  }, [])

  const handleBellClick = async () => {
    if (notifPermission !== 'granted') {
      const res = await requestNotificationPermission()
      const current = res.permission || getNotificationPermission()
      setNotifPermission(current)
      if (res.success) {
        sendNotification('HADIRKAI8 — Pengingat Aktif 🎉', {
          body: 'Notifikasi pengingat presensi berhasil diaktifkan di perangkat ini!',
          tag: 'kai-welcome-notif'
        })
      } else if (current === 'denied') {
        alert('Izin notifikasi diblokir pada browser Anda. Silakan klik ikon gembok / setelan situs di bilah alamat browser untuk mengizinkan notifikasi.')
      }
    } else {
      sendNotification('HADIRKAI8 — Status Notifikasi Aktif', {
        body: 'Izin notifikasi presensi sudah aktif di perangkat ini.',
        tag: 'kai-bell-check'
      })
    }
  }

  const durasi = hitungDurasi(status.jamMasuk, status.jamPulang)

  const statusLabel = () => {
    if (status.sudahPulang) return { text: 'Sudah Pulang', cls: 'badge-green' }
    if (status.sudahMasuk) return { text: 'Sudah Masuk', cls: 'badge-amber' }
    return { text: 'Belum Presensi', cls: 'badge-red' }
  }

  if (!user) return <div className="app-shell" style={{ background: '#ffffff', minHeight: '100dvh' }} />

  const sl = statusLabel()

  return (
    <div className="app-shell">
      <div className="dashboard-wrap">
        {/* Panduan Khusus Pengguna iPhone/iOS Safari (Sementar hanya untuk admin) */}
        {user?.role === 'admin' && <IosInstallPrompt />}

        {/* Banner Section */}
        <div className="dash-banner animate-fade-in">
          <img src="/banner.jpg" alt="KAI Banner" className="banner-img" />
        </div>

        <div className="dash-header animate-fade-in">
          <div>
            <p className="dash-greeting">Halo, {user.nama.split(' ')[0]}</p>
            <p className="dash-date">{formatTanggal()}</p>
          </div>
          <Avatar
            src={user.foto}
            name={user.nama}
            size={42}
            style={{ cursor: 'pointer', transition: 'opacity 0.25s', flexShrink: 0 }}
            onClick={() => navigate('/profil')}
          />
        </div>

        <div className="dash-location animate-fade-in">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M8 2C5.8 2 4 3.8 4 6c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" fill="currentColor"/>
            <circle cx="8" cy="6" r="1.5" fill="white"/>
          </svg>
          {user.lokasi || 'Lokasi tidak ditetapkan'}
        </div>

        <LocationBanner />

        <div className="dash-clock-container animate-fade-up">
          <div className="dash-clock">{jam}</div>
          <button 
            type="button"
            className={`dash-bell-btn ${notifPermission === 'granted' ? 'bell-granted' : 'bell-denied'}`}
            onClick={handleBellClick}
            title={notifPermission === 'granted' ? 'Notifikasi Aktif (Izin Diberikan)' : 'Notifikasi Belum Diizinkan (Klik untuk mengaktifkan)'}
            aria-label="Status Notifikasi Presensi"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>

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
          {/* Runtime counter — hanya tampil saat sudah masuk tapi belum pulang */}
          {status.sudahMasuk && !status.sudahPulang && (
            <div className="dash-runtime-row">
              <span className="dash-runtime-icon">⏱</span>
              <span className="dash-runtime-label">Berjalan</span>
              <span className="dash-runtime-value dash-runtime-live">
                {runtime}
              </span>
            </div>
          )}

        </div>

        {/* Pengingat Notifikasi Presensi PWA (Sementara hanya admin) */}
        {user?.role === 'admin' && <NotificationPrompt />}

        <div className="dash-actions animate-fade-up">
          <button 
            className="btn btn-success" 
            disabled={status.sudahMasuk || geo.isDiLuarArea || geo.distance === null || geo.err} 
            onClick={() => navigate('/presensi/masuk')}
          >
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {status.sudahMasuk ? 'Sudah Presensi Masuk' : geo.err ? 'GPS Error' : (geo.distance === null ? 'Mencari Lokasi...' : (geo.isDiLuarArea ? 'Di Luar Area' : 'Presensi Masuk'))}
          </button>
          <button 
            className="btn btn-outline" 
            style={{ color: status.sudahMasuk && !status.sudahPulang && !geo.isDiLuarArea ? 'var(--red)' : undefined, borderColor: status.sudahMasuk && !status.sudahPulang && !geo.isDiLuarArea ? 'var(--red)' : undefined }} 
            disabled={!status.sudahMasuk || status.sudahPulang || geo.isDiLuarArea || geo.distance === null || geo.err} 
            onClick={() => navigate('/presensi/pulang')}
          >
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <path d="M12 4l-7 6 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {status.sudahPulang ? 'Sudah Presensi Pulang' : geo.err ? 'GPS Error' : (geo.distance === null ? 'Mencari Lokasi...' : (geo.isDiLuarArea ? 'Di Luar Area' : 'Presensi Pulang'))}
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
