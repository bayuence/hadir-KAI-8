import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import './Admin.css'

import AdminHeader from '../../components/AdminHeader'

export default function AdminPresensi() {
  const navigate = useNavigate()
  const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
  const [tanggal, setTanggal] = useState(todayStr)
  const [presensiList, setPresensiList] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPresensi(tanggal)
  }, [tanggal])

  const fetchPresensi = (tgl) => {
    setLoading(true)
    api.admin.getAllPresensi(tgl)
      .then(d => { if (d.success) setPresensiList(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const filtered = presensiList.filter(p =>
    p.nama?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s) => {
    if (s === 'Hadir') return '#22c55e'
    if (s === 'Izin') return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title="Rekap Presensi" />

        {/* Date picker */}
        <div className="admin-date-picker">
          <label>Tanggal</label>
          <input
            type="date"
            className="admin-date-input"
            onChange={e => {
              const d = new Date(e.target.value)
              const formatted = [
                String(d.getDate()).padStart(2,'0'),
                String(d.getMonth()+1).padStart(2,'0'),
                d.getFullYear()
              ].join('/')
              setTanggal(formatted)
            }}
          />
        </div>

        {/* Search */}
        <div className="admin-search-wrap">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" className="admin-search-icon">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="admin-search-input"
            placeholder="Cari nama peserta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Summary */}
        {!loading && presensiList.length > 0 && (
          <div className="admin-presensi-summary">
            <span>✅ Hadir: {presensiList.filter(p => p.jamMasuk).length}</span>
            <span>⏳ Belum Pulang: {presensiList.filter(p => p.jamMasuk && !p.jamPulang).length}</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="admin-loading"><div className="spinner"/><p>Memuat...</p></div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📊</div>
            <p>Tidak ada data presensi untuk tanggal ini.</p>
          </div>
        ) : (
          <div className="admin-presensi-list">
            {filtered.map((p, i) => (
              <div className="admin-presensi-row" key={i}>
                <div className="admin-presensi-avatar" style={{ background: statusColor(p.status) }}>
                  {p.nama?.charAt(0)?.toUpperCase()}
                </div>
                <div className="admin-presensi-info">
                  <p className="admin-presensi-nama">{p.nama}</p>
                  <p className="admin-presensi-meta">{p.lokasi}</p>
                </div>
                <div className="admin-presensi-times">
                  <div className="admin-time-chip">
                    <span className="dot-green-sm"/>
                    <span>{p.jamMasuk || '--:--'}</span>
                  </div>
                  <div className="admin-time-chip">
                    <span className="dot-red-sm"/>
                    <span>{p.jamPulang || '--:--'}</span>
                  </div>
                  {p.totalJam && <span className="admin-total-chip">{p.totalJam}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="profil" />
    </div>
  )
}
