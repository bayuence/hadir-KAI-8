import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import AdminHeader from '../../components/AdminHeader'
import BottomNav from '../../components/BottomNav'
import Avatar from '../../components/Avatar'
import './Admin.css'
import './AdminDashboard.css'

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ hadir: 0, izin: 0, tidakHadir: 0, pending: 0, total: 0 })
  const [rekap, setRekap] = useState([])
  const [periode, setPeriode] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    Promise.all([api.admin.getDashboard(), api.admin.getRekapBulanan()])
      .then(([d, r]) => {
        if (d && d.success) setStats(d.data)
        else setError(d?.message || 'Gagal memuat data dashboard.')
        if (r && r.success) {
          setRekap(r.data || [])
          setPeriode(`${NAMA_BULAN[(r.bulan || 1) - 1]} ${r.tahun}`)
        }
      })
      .catch(() => setError('Tidak dapat terhubung ke server.'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const rate = stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0

  // Jumlah peserta yang punya catatan bulan ini (untuk footer tabel)
  const totalTercatat = useMemo(() => rekap.filter(p => p.hadir + p.izin + p.alfa > 0).length, [rekap])

  const CHIPS = [
    { key: 'hadir',      label: 'Hadir',       tone: 'green', value: stats.hadir },
    { key: 'izin',       label: 'Izin',        tone: 'amber', value: stats.izin },
    { key: 'tidakHadir', label: 'Tidak Hadir', tone: 'red',   value: stats.tidakHadir },
    { key: 'pending',    label: 'Menunggu',    tone: 'blue',  value: stats.pending },
  ]

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title={`Halo, ${user?.nama?.split(' ')[0] || 'Admin'}`} subtitle={today} />

        {/* ── Hero Card ── */}
        <div className="adb-hero">
          <div className="adb-hero-top">
            <div>
              <div className="adb-hero-label">Tingkat Kehadiran Hari Ini</div>
              <div className="adb-hero-value">
                {loading
                  ? <span className="adb-hero-skeleton" />
                  : <>{rate}<span className="adb-hero-unit">%</span></>}
              </div>
            </div>
            <button
              className={`adb-refresh${refreshing ? ' spinning' : ''}`}
              onClick={() => load(true)}
              disabled={refreshing || loading}
              aria-label="Muat ulang data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          <div className="adb-hero-bar">
            <div className="adb-hero-bar-head">
              <span>{stats.hadir} dari {stats.total} peserta hadir</span>
              <strong>{loading ? '-' : `${rate}%`}</strong>
            </div>
            <div className="adb-hero-track">
              <div className="adb-hero-fill" style={{ width: `${loading ? 0 : rate}%` }} />
            </div>
          </div>
          <div className="adb-hero-date">{today}</div>
        </div>

        {/* ── Error ── */}
        {error && !loading && (
          <div className="adb-error">
            <div className="adb-error-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="adb-error-title">Data gagal dimuat</div>
            <div className="adb-error-msg">{error}</div>
            <button className="adb-error-btn" onClick={() => load(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Coba lagi
            </button>
          </div>
        )}

        {!error && (
          <>
            {/* ── Statistik ringkas: satu baris kecil ── */}
            <div className="adb-chip-row">
              {CHIPS.map(c => (
                <div className={`adb-chip adb-chip--${c.tone}`} key={c.key}>
                  <span className="adb-chip-dot" />
                  <span className="adb-chip-body">
                    <span className="adb-chip-value">{loading ? <span className="adb-skeleton-line" /> : c.value}</span>
                    <span className="adb-chip-label">{c.label}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* ── Tabel Rekap Bulanan ── */}
            <div className="adb-section-label">Rekap Kehadiran {periode ? `— ${periode}` : ''}</div>
            <div className="adb-table-card">
              {loading ? (
                <div className="adb-table-loading">
                  <div className="spinner" />
                  <span>Memuat rekap...</span>
                </div>
              ) : rekap.length === 0 ? (
                <div className="adb-table-empty">Belum ada data peserta aktif.</div>
              ) : (
                <>
                  <div className="adb-table-wrap">
                    <table className="adb-table">
                      <thead>
                        <tr>
                          <th className="adb-th-name">Nama Peserta</th>
                          <th className="adb-col-num">Hadir</th>
                          <th className="adb-col-num">Izin</th>
                          <th className="adb-col-num">Alfa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekap.map(p => (
                          <tr key={p.id}>
                            <td className="adb-td-name">
                              <div className="adb-td-person">
                                <Avatar src={p.foto} name={p.nama} size={28} />
                                <span className="adb-td-nama">{p.nama}</span>
                              </div>
                            </td>
                            <td className="adb-col-num"><span className="adb-num adb-num--green">{p.hadir}</span></td>
                            <td className="adb-col-num"><span className="adb-num adb-num--amber">{p.izin}</span></td>
                            <td className="adb-col-num"><span className={`adb-num ${p.alfa > 0 ? 'adb-num--red' : 'adb-num--muted'}`}>{p.alfa}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="adb-table-foot">
                    <span>{totalTercatat} dari {rekap.length} peserta memiliki catatan</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <BottomNav active="profil" />
    </div>
  )
}
