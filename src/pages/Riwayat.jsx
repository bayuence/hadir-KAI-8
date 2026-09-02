import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import './Riwayat.css'

// Convert Google Drive URL to a renderable thumbnail
function driveThumb(url) {
  if (!url) return null
  // Sudah format uc?id=
  const m1 = url.match(/[?&]id=([^&]+)/)
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w120`
  // Format /file/d/ID/
  const m2 = url.match(/\/file\/d\/([^/]+)/)
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w120`
  return url
}

// Format tanggal dari "DD/MM/YYYY" ke "Selasa, 1 September 2026"
function formatTglIndo(tglStr) {
  if (!tglStr) return ''
  const parts = tglStr.split('/')
  if (parts.length !== 3) return tglStr
  const d = new Date(parts[2], parts[1] - 1, parts[0])
  if (isNaN(d.getTime())) return tglStr
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]}`
}

export default function Riwayat() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulanFilter, setBulanFilter] = useState('Semua')
  const [statusFilter, setStatusFilter] = useState('Semua Status')

  useEffect(() => {
    if (!user || !token) return
    api.getRiwayat(user.id, token)
      .then(res => { if (res.success) setRiwayat(res.data) })
      .catch(err => console.error('Error fetching riwayat:', err))
      .finally(() => setLoading(false))
  }, [user, token])

  // Filter data
  const filtered = riwayat.filter(item => {
    const matchStatus = statusFilter === 'Semua Status' || item.status === statusFilter
    const matchBulan = bulanFilter === 'Semua' || (item.tanggal || '').includes(
      bulanFilter === 'September' ? '/09/' : bulanFilter === 'Agustus' ? '/08/' : bulanFilter === 'Juli' ? '/07/' : ''
    )
    return matchStatus && matchBulan
  })

  // Summary
  const totalHari = riwayat.filter(i => i.status === 'Hadir').length
  const totalJamMenit = riwayat.reduce((acc, item) => {
    if (!item.totalJam) return acc
    const m = item.totalJam.match(/(\d+)j\s*(\d+)m/)
    if (m) return acc + parseInt(m[1]) * 60 + parseInt(m[2])
    return acc
  }, 0)
  const totalJamStr = totalJamMenit > 0 ? `${Math.floor(totalJamMenit/60)}j ${totalJamMenit%60}m` : ''

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Riwayat Presensi</h1>
      </div>
      
      <div className="riwayat-wrap">
        {/* Filter Row */}
        <div className="filter-row animate-fade-in">
          <select className="filter-select" value={bulanFilter} onChange={e => setBulanFilter(e.target.value)}>
            <option value="Semua">Semua Bulan</option>
            <option value="September">September 2026</option>
            <option value="Agustus">Agustus 2026</option>
            <option value="Juli">Juli 2026</option>
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="Semua Status">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Alfa">Alfa</option>
          </select>
        </div>

        {/* List */}
        <div className="riwayat-list animate-fade-up">
          {loading ? (
             <div className="text-center text-grey text-sm mt-8">Memuat riwayat...</div>
          ) : filtered.length === 0 ? (
             <div className="text-center text-grey text-sm mt-8">Belum ada riwayat</div>
          ) : (
            filtered.map((item, idx) => (
              <div key={idx} className="riwayat-card">
                <div className="rc-header">
                  <div>
                    <p className="rc-date">{formatTglIndo(item.tanggal)}</p>
                    <p className="rc-loc">{item.lokasi || 'Kantor Daop'}</p>
                  </div>
                  <span className={`badge ${item.status === 'Hadir' ? 'badge-green' : item.status === 'Izin' ? 'badge-amber' : 'badge-red'}`}>
                    {item.status}
                  </span>
                </div>
                
                <div className="rc-body">
                  <div className="rc-times">
                    <div className="rc-time-row">
                      <div className="rc-dot dot-green"></div>
                      <span className="rc-time-text">
                        {item.jamMasuk ? <strong>{item.jamMasuk}</strong> : <span style={{color:'#9ca3af'}}>--:--</span>} Masuk
                      </span>
                      {item.fotoMasuk && (
                        <img src={driveThumb(item.fotoMasuk)} className="rc-thumb" alt="foto masuk"
                          onError={e => { e.target.style.display='none' }}/>
                      )}
                    </div>
                    <div className="rc-time-row">
                      <div className="rc-dot dot-red"></div>
                      <span className="rc-time-text">
                        {item.jamPulang ? <strong>{item.jamPulang}</strong> : <span style={{color:'#9ca3af'}}>--:--</span>} Pulang
                      </span>
                      {item.fotoPulang && (
                        <img src={driveThumb(item.fotoPulang)} className="rc-thumb" alt="foto pulang"
                          onError={e => { e.target.style.display='none' }}/>
                      )}
                    </div>
                    {item.totalJam && (
                      <div className="rc-time-row mt-2">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" style={{marginRight:8, marginLeft:-2, color:'var(--grey-400)'}}>
                          <circle cx="8" cy="8" r="6" strokeWidth="1.5"/>
                          <path d="M8 5v3l2 2" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="rc-time-text text-black font-bold">{item.totalJam}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Footer */}
        {!loading && riwayat.length > 0 && (
          <div className="riwayat-summary animate-fade-up" style={{animationDelay:'0.1s'}}>
            <span className="font-bold">{totalHari} Hari</span>
            {totalJamStr && <> · <span className="font-bold">{totalJamStr}</span> Total</>}
          </div>
        )}
      </div>

      <BottomNav active="riwayat" />
    </div>
  )
}

