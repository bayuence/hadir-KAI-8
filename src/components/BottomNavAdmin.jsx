import React from 'react'
import { useNavigate } from 'react-router-dom'

const items = [
  {
    key: 'home', label: 'Dashboard', to: '/admin',
    icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="12" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="12" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="12" y="12" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg>
  },
  {
    key: 'peserta', label: 'Peserta', to: '/admin/peserta',
    icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><circle cx="11" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M3 19c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  },
  {
    key: 'presensi', label: 'Presensi', to: '/admin/presensi',
    icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="4" y="3" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8h6M8 11h6M8 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  },
  {
    key: 'izin', label: 'Izin', to: '/admin/izin',
    icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M12 2l2.4 6.4H21l-5.2 3.8 2 6.4L12 14.8l-5.8 3.8 2-6.4L3 8.4h6.6L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  },
]

export default function BottomNavAdmin({ active }) {
  const navigate = useNavigate()
  return (
    <nav className="bottom-nav-admin">
      {items.map(item => (
        <button
          key={item.key}
          className={`bnav-admin-item ${active === item.key ? 'active' : ''}`}
          onClick={() => navigate(item.to)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
