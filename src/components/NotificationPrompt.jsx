import React, { useState, useEffect } from 'react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
  isNotificationSupported
} from '../services/notificationService'
import './NotificationPrompt.css'

export default function NotificationPrompt() {
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(false)
  const [testSent, setTestSent] = useState(false)

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  if (!isNotificationSupported() || permission === 'unsupported') {
    return null
  }

  const handleEnable = async () => {
    setLoading(true)
    const res = await requestNotificationPermission()
    setPermission(res.permission || getNotificationPermission())
    setLoading(false)

    if (res.success) {
      // Kirim sambutan notifikasi langsung
      sendNotification('HADIRKAI8 — Pengingat Aktif 🎉', {
        body: 'Notifikasi pengingat presensi berhasil diaktifkan di perangkat ini!',
        tag: 'kai-welcome-notif'
      })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 5000)
    }
  }

  const handleTestNotification = async () => {
    setTestSent(true)
    await sendNotification('HADIRKAI8 — Tes Notifikasi', {
      body: 'Halo! Ini adalah contoh notifikasi pengingat presensi magang KAI Daop 8.',
      tag: 'kai-test-reminder'
    })
    setTimeout(() => setTestSent(false), 4000)
  }

  return (
    <div className={`notif-prompt-card ${permission}`}>
      <div className="notif-prompt-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>

      <div className="notif-prompt-content">
        {permission === 'granted' ? (
          <>
            <div className="notif-prompt-header">
              <span className="notif-badge-active">Pengingat Presensi Aktif</span>
            </div>
            <p className="notif-prompt-desc">
              Perangkat Anda siap menerima notifikasi jam masuk & pulang.
            </p>
            <button
              className="btn-test-notif"
              onClick={handleTestNotification}
              disabled={testSent}
            >
              {testSent ? '✓ Notifikasi Dikirim' : 'Kirim Tes Notifikasi'}
            </button>
          </>
        ) : permission === 'denied' ? (
          <>
            <div className="notif-prompt-header">
              <span className="notif-badge-denied">Notifikasi Diblokir</span>
            </div>
            <p className="notif-prompt-desc">
              Izin notifikasi dinonaktifkan di browser. Buka setelan browser untuk mengizinkan pengingat.
            </p>
          </>
        ) : (
          <>
            <div className="notif-prompt-header">
              <strong>Aktifkan Pengingat Presensi</strong>
            </div>
            <p className="notif-prompt-desc">
              Dapatkan notifikasi otomatis setiap pagi agar tidak lupa presensi masuk.
            </p>
            <button
              className="btn-enable-notif"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Aktifkan Notifikasi'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
