import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const navItems = [
  {
    id: 'home', label: 'Beranda', path: '/dashboard',
    icon: (active) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 20v-7h6v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'riwayat', label: 'Riwayat', path: '/riwayat',
    icon: (active) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <rect x="3" y="4" width="16" height="15" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 8h8M7 12h5" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 2v4M7 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'izin', label: 'Izin', path: '/izin',
    icon: (active) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <rect x="4" y="3" width="14" height="16" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 9h6M8 13h4" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'profil', label: 'Profil', path: '/profil',
    icon: (active) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <circle cx="11" cy="7" r="4"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 19c0-4 3.6-6 8-6s8 2 8 6"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
]

export default function BottomNav({ active }) {
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            {item.icon(isActive)}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
