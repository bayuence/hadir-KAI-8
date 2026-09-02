import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useGeo } from '../hooks/useGeo'

/**
 * Menampilkan banner status lokasi realtime.
 * Hijau  = di dalam radius penugasan
 * Merah  = di luar radius penugasan
 * Abu    = GPS belum siap / tidak ada lokasi penugasan
 */
export default function LocationBanner() {
  const { user } = useAuth()
  const geo = useGeo(user?.lat, user?.long, user?.radius || 100)

  // Format jarak: < 1 m → tampilkan cm, >= 1 m → tampilkan m
  const formatJarak = (meter) => {
    if (meter === null || meter === undefined) return null
    if (meter < 1) {
      const cm = Math.round(meter * 100)
      return `${cm} cm`
    }
    if (meter >= 1000) {
      return `${(meter / 1000).toFixed(2)} km`
    }
    return `${Math.round(meter)} m`
  }

  // Jika tidak ada lokasi penugasan
  if (!user?.lat || !user?.long) return null

  // GPS sedang loading
  if (geo.lat === null && !geo.err) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', borderRadius: '12px',
        background: '#f1f5f9', marginBottom: '12px',
        fontSize: '0.8rem', color: '#64748b', fontWeight: 500
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#94a3b8', display: 'inline-block',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}/>
        Mendeteksi lokasi GPS...
      </div>
    )
  }

  // GPS error
  if (geo.err) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', borderRadius: '12px',
        background: '#fef3c7', marginBottom: '12px',
        fontSize: '0.8rem', color: '#92400e', fontWeight: 500
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        GPS tidak aktif
      </div>
    )
  }

  const jarakStr = formatJarak(geo.distance)
  const diDalam = !geo.isDiLuarArea

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: '12px', marginBottom: '12px',
      background: diDalam ? '#f0fdf4' : '#fff1f2',
      border: `1px solid ${diDalam ? '#bbf7d0' : '#fecdd3'}`,
      transition: 'all 0.4s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Dot animasi realtime */}
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%',
          background: diDalam ? '#22c55e' : '#ef4444',
          display: 'inline-block', flexShrink: 0,
          boxShadow: diDalam
            ? '0 0 0 3px rgba(34,197,94,0.25)'
            : '0 0 0 3px rgba(239,68,68,0.25)',
          animation: 'pulse 2s ease-in-out infinite'
        }}/>
        <span style={{
          fontSize: '0.8rem', fontWeight: 600,
          color: diDalam ? '#15803d' : '#be123c'
        }}>
          {diDalam ? 'Dalam area penugasan' : 'Di luar area penugasan'}
        </span>
      </div>

      {jarakStr !== null && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 700,
            color: diDalam ? '#16a34a' : '#dc2626'
          }}>
            {jarakStr}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', lineHeight: 1 }}>
            dari pusat
          </span>
          {geo.accuracy && (
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
              Akurasi GPS ±{Math.round(geo.accuracy)}m
            </span>
          )}
        </div>
      )}
    </div>
  )
}
