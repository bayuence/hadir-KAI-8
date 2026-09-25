import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import AdminHeader from '../../components/AdminHeader'
import Avatar from '../../components/Avatar'
import { formatTime } from '../../utils/date'
import './Admin.css'
import './AdminPresensi.css'

const aktif = (p) => {
  if (p.masaMagang) return p.masaMagang === 'Aktif'
  return p.status !== 'Selesai' && p.status !== 'Belum'
}

export default function AdminPresensi() {
  const getTodayIso = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const [dateIso,      setDateIso]      = useState(getTodayIso)
  const [presensiList, setPresensiList] = useState([])
  const [loading,      setLoading]      = useState(false)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [filterLokasi, setFilterLokasi] = useState('Semua')

  useEffect(() => { fetchPresensi(dateIso) }, [dateIso])

  const fetchPresensi = (tglStr) => {
    setLoading(true)
    api.admin.getAllPresensi(tglStr)
      .then(d => {
        if (d.success) setPresensiList(d.data || [])
        else           setPresensiList([])
      })
      .catch(() => setPresensiList([]))
      .finally(() => setLoading(false))
  }

  const lokasiOptions = useMemo(() => {
    const set = new Set(presensiList.map(p => p.penempatan || '').filter(Boolean))
    return ['Semua', ...Array.from(set).sort()]
  }, [presensiList])

  const filtered = useMemo(() => {
    return presensiList.filter(p => {
      const matchSearch = !search || p.nama?.toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        filterStatus === 'Semua'       ||
        (filterStatus === 'Hadir'      && p.status === 'Hadir' && aktif(p))                     ||
        (filterStatus === 'Blm Pulang' && p.status === 'Hadir' && p.jamMasuk && !p.jamPulang && aktif(p)) ||
        (filterStatus === 'Ijin'       && p.status?.startsWith('Ijin') && aktif(p))              ||
        (filterStatus === 'Alfa'       && p.status === 'Alfa')                                   ||
        (filterStatus === 'Selesai'    && p.masaMagang === 'Selesai')                             ||
        (filterStatus === 'Belum'      && p.masaMagang === 'Belum')
      const matchLokasi = filterLokasi === 'Semua' || (p.penempatan || '') === filterLokasi
      return matchSearch && matchStatus && matchLokasi
    })
  }, [presensiList, search, filterStatus, filterLokasi])

  const stats = useMemo(() => {
    // Peserta dihitung hanya jika masih dalam masa magang (masaMagang === 'Aktif')
    const dalamMasa = presensiList.filter(aktif)
    return {
      total:     dalamMasa.length,
      hadir:     dalamMasa.filter(p => p.status === 'Hadir').length,
      blmPulang: dalamMasa.filter(p => p.status === 'Hadir' && p.jamMasuk && !p.jamPulang).length,
      ijin:      dalamMasa.filter(p => p.status?.startsWith('Ijin')).length,
      alfa:      dalamMasa.filter(p => p.status === 'Alfa').length,
      selesai:   presensiList.filter(p => p.masaMagang === 'Selesai').length,
      belum:     presensiList.filter(p => p.masaMagang === 'Belum').length,
    }
  }, [presensiList])

  const shiftDay = (n) => {
    const d = new Date(dateIso)
    d.setDate(d.getDate() + n)
    setDateIso(d.toISOString().split('T')[0])
  }

  const formatDateDisplay = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return new Date(Number(y), Number(m) - 1, Number(d))
      .toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const statusBadge = (p) => {
    // Penanda utama: peserta di luar masa magang
    if (p.masaMagang === 'Selesai') return { label: 'Selesai Magang', cls: 'badge-grey', subLabel: p.status === 'Hadir' ? 'Pernah Absen' : null, subCls: 'badge-grey' }
    if (p.masaMagang === 'Belum')   return { label: 'Belum Mulai',    cls: 'badge-grey' }
    // Cek Ijin dan Alfa DULU sebelum cek jamMasuk/jamPulang
    if (p.status?.startsWith('Ijin')) return { label: p.status,      cls: 'badge-amber' }
    if (p.status === 'Alfa')          return { label: 'Alfa',        cls: 'badge-red'   }
    if (p.status === 'Hadir' && p.jamMasuk && !p.jamPulang)
                                      return { label: 'Hadir ✓',     cls: 'badge-green', subLabel: 'Blm Pulang', subCls: 'badge-amber' }
    if (p.status === 'Hadir')         return { label: 'Hadir',    cls: 'badge-green' }
    return { label: p.status || '-', cls: 'badge-grey' }
  }

  const STAT_CARDS = [
    { key: 'Total',      val: stats.total,     cls: 'neutral', icon: 'YY' },
    { key: 'Hadir',      val: stats.hadir,     cls: 'primary', icon: 'CK' },
    { key: 'Blm Pulang', val: stats.blmPulang, cls: 'warning', icon: 'TM' },
    { key: 'Ijin',       val: stats.ijin,      cls: 'info',    icon: 'IJ' },
    { key: 'Alfa',       val: stats.alfa,      cls: 'danger',  icon: 'AL' },
    { key: 'Selesai',    val: stats.selesai,   cls: 'slate',   icon: 'SE' },
  ]

  return (
    <div className="app-shell">
      <div className="admin-wrap" style={{ paddingBottom: '100px' }}>
        <AdminHeader title="Rekap Presensi" />

        <div className="ap-date-nav">
          <button className="ap-date-btn" onClick={() => shiftDay(-1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="ap-date-display">
            <span className="ap-date-label">PILIH TANGGAL</span>
            <input type="date" className="ap-date-input-hidden" value={dateIso} onChange={e => setDateIso(e.target.value)} />
            <span className="ap-date-text">{formatDateDisplay(dateIso)} cal</span>
          </div>
          <button className="ap-date-btn" onClick={() => shiftDay(1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div className="ap-stats-grid ap-stats-6">
          {STAT_CARDS.map(s => (
            <button
              key={s.key}
              className={`ap-stat-card ${s.cls} ${filterStatus === s.key ? 'ap-stat-active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === s.key ? 'Semua' : s.key)}
            >
              <span className="ap-stat-lbl-icon">{s.icon}</span>
              <span className="ap-stat-val">{s.val}</span>
              <span className="ap-stat-lbl">{s.key}</span>
            </button>
          ))}
        </div>

        <div className="ap-filter-bar">
          <div className="ap-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ap-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="ap-search-input" placeholder="Cari nama peserta magang..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="ap-filter-row">
            {lokasiOptions.length > 2 && (
              <select className="ap-filter-select" value={filterLokasi} onChange={e => setFilterLokasi(e.target.value)}>
                {lokasiOptions.map(l => (
                  <option key={l} value={l}>{l === 'Semua' ? 'Semua Penempatan' : l}</option>
                ))}
              </select>
            )}
            <div className="ap-status-pills">
              {['Semua','Hadir','Blm Pulang','Ijin','Alfa','Selesai'].map(s => (
                <button key={s} className={`ap-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {!loading && presensiList.length > 0 && (
          <div className="ap-result-count">
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{stats.total}</strong> peserta aktif
          </div>
        )}

        {loading ? (
          <div className="admin-loading"><div className="spinner"/><p>Memuat Data Presensi...</p></div>
        ) : filtered.length === 0 ? (
          <div className="ap-empty-state">
            <div className="ap-empty-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h4>{presensiList.length === 0 ? 'Tidak Ada Data' : 'Tidak Ada yang Cocok'}</h4>
            <p>{presensiList.length === 0 ? 'Belum ada peserta aktif atau data untuk tanggal ini.' : 'Coba ubah filter atau kata kunci pencarian.'}</p>
          </div>
        ) : (
          <div className="ap-list">
            {filtered.map((p, i) => {
              const badge = statusBadge(p)
              const nonaktif = p.masaMagang && p.masaMagang !== 'Aktif'
              const clsKartu = nonaktif ? 'grey' : badge.cls.replace('badge-', '')
              return (
                <div className={`ap-card ap-card-${clsKartu}`} key={p.id || i}>
                  <Avatar src={p.foto} name={p.nama} size={44} className="ap-card-avatar" />
                  <div className="ap-card-body">
                    <h4 className="ap-card-name" title={p.nama}>{p.nama}</h4>
                    <div className="ap-card-badges">
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      {badge.subLabel && <span className={`badge ${badge.subCls}`}>{badge.subLabel}</span>}
                    </div>
                    <p className="ap-card-loc">
                      {p.penempatan
                        ? <>{p.penempatan}</>
                        : <span className="ap-loc-none">Belum ada penempatan</span>
                      }
                    </p>
                  </div>
                  <div className={`ap-card-times${nonaktif ? ' is-nonaktif' : ''}`}>
                    {/* Tombol WA */}
                    {p.noHp && (
                      <div className="ap-wa-wrap">
                        <a
                          href={`https://wa.me/${p.noHp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ap-wa-btn"
                          title={`Chat WA ${p.nama}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      </div>
                    )}
                    {p.status === 'Alfa' ? (
                      <div className="ap-time-alfa">Tidak<br/>Hadir</div>
                    ) : nonaktif && !p.jamMasuk ? (
                      <div className="ap-time-selesai">{p.masaMagang === 'Selesai' ? 'Selesai' : 'Belum'}</div>
                    ) : p.status?.startsWith('Ijin') ? (
                      <div className="ap-time-ijin">
                        <span className="ap-time-ijin-lbl">Lapor</span>
                        <span className="ap-time-val">{p.jamMasuk ? formatTime(p.jamMasuk) : '--:--'}</span>
                      </div>
                    ) : (
                      <>
                        <div className="ap-time-row">
                          <span className="ap-time-dot in"/>
                          <span className="ap-time-val">{p.jamMasuk ? formatTime(p.jamMasuk) : '--:--'}</span>
                        </div>
                        <div className="ap-time-row">
                          <span className="ap-time-dot out"/>
                          <span className="ap-time-val">{p.jamPulang ? formatTime(p.jamPulang) : '--:--'}</span>
                        </div>
                        {p.totalJam && <div className="ap-total-jam">{p.totalJam}</div>}
                      </>
                    )}
                    {nonaktif && p.jamMasuk && (
                      <span className="ap-time-nonaktif-lbl">Luar Masa</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav active="profil" />
    </div>
  )
}
