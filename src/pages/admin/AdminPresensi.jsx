import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import AdminHeader from '../../components/AdminHeader'
import Avatar from '../../components/Avatar'
import './Admin.css'
import './AdminPresensi.css'

export default function AdminPresensi() {
  const navigate = useNavigate()

  const getTodayIso = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const [dateIso, setDateIso] = useState(getTodayIso())
  const [presensiList, setPresensiList] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const [y, m, d] = dateIso.split('-')
    fetchPresensi(`${d}/${m}/${y}`)
  }, [dateIso])

  const fetchPresensi = (tglStr) => {
    setLoading(true)
    api.admin.getAllPresensi(tglStr)
      .then(d => { if (d.success) setPresensiList(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const filtered = presensiList.filter(p =>
    p.nama?.toLowerCase().includes(search.toLowerCase())
  )

  const hadirs = presensiList.filter(p => p.jamMasuk).length
  const belumPulang = presensiList.filter(p => p.jamMasuk && !p.jamPulang).length
  const izins = presensiList.filter(p => p.status === 'Izin').length

  const handlePrevDay = () => {
    const d = new Date(dateIso)
    d.setDate(d.getDate() - 1)
    setDateIso(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(dateIso)
    d.setDate(d.getDate() + 1)
    setDateIso(d.toISOString().split('T')[0])
  }

  const formatDateDisplay = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    return dt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="app-shell">
      <div className="admin-wrap" style={{ paddingBottom: '100px' }}>
        <AdminHeader title="Rekap Presensi" />

        {/* Date Navigator */}
        <div className="ap-date-nav">
          <button className="ap-date-btn" onClick={handlePrevDay} title="Hari Sebelumnya">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="ap-date-display">
            <span className="ap-date-label">PILIH TANGGAL</span>
            <input 
              type="date" 
              className="ap-date-input-hidden" 
              value={dateIso}
              onChange={e => setDateIso(e.target.value)}
            />
            <span className="ap-date-text">{formatDateDisplay(dateIso)} 📅</span>
          </div>
          <button className="ap-date-btn" onClick={handleNextDay} title="Hari Berikutnya">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="ap-stats-grid">
          <div className="ap-stat-card primary">
            <div className="ap-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="ap-stat-info">
              <span className="ap-stat-val">{hadirs}</span>
              <span className="ap-stat-lbl">Hadir</span>
            </div>
          </div>
          <div className="ap-stat-card warning">
            <div className="ap-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="ap-stat-info">
              <span className="ap-stat-val">{belumPulang}</span>
              <span className="ap-stat-lbl">Blm Pulang</span>
            </div>
          </div>
          <div className="ap-stat-card info">
            <div className="ap-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div className="ap-stat-info">
              <span className="ap-stat-val">{izins}</span>
              <span className="ap-stat-lbl">Izin</span>
            </div>
          </div>
        </div>

        {/* Search Wrap */}
        <div className="ap-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ap-search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="ap-search-input"
            placeholder="Cari nama peserta magang..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Presensi List */}
        {loading ? (
          <div className="admin-loading"><div className="spinner"/><p>Memuat Data Presensi...</p></div>
        ) : filtered.length === 0 ? (
          <div className="ap-empty-state">
            <div className="ap-empty-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h4>Tidak Ada Data Presensi</h4>
            <p>Belum ada catatan presensi untuk tanggal ini.</p>
          </div>
        ) : (
          <div className="ap-list">
            {filtered.map((p, i) => (
              <div className="ap-card" key={i}>
                <Avatar src={p.foto} name={p.nama} size={46} className="ap-card-avatar" />
                
                <div className="ap-card-body">
                  <h4 className="ap-card-name">{p.nama}</h4>
                  <p className="ap-card-loc">{p.lokasi || 'Kantor Daop 8'}</p>
                </div>

                <div className="ap-card-times">
                  <div className="ap-time-row">
                    <span className="ap-time-dot in"></span>
                    <span className="ap-time-val">{p.jamMasuk || '--:--'}</span>
                  </div>
                  <div className="ap-time-row">
                    <span className="ap-time-dot out"></span>
                    <span className="ap-time-val">{p.jamPulang || '--:--'}</span>
                  </div>
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

