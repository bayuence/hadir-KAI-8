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

// Format tanggal dari berbagai format ke "Selasa, 1 September 2026"
// Handle: "DD/MM/YYYY" (web app, zero-padded) dan "M/D/YYYY" (Google Sheets US locale)
function normalizeTglParts(tglStr) {
  if (!tglStr) return null
  const parts = tglStr.split('/')
  if (parts.length !== 3) return null
  const p0 = parts[0], p1 = parts[1], p2 = parts[2]
  const n0 = parseInt(p0), n1 = parseInt(p1), n2 = parseInt(p2)
  let day, month, year
  if (n0 > 12) {
    // Pasti DD/MM/YYYY
    day = n0; month = n1; year = n2
  } else if (n1 > 12) {
    // Pasti M/D/YYYY format AS
    month = n0; day = n1; year = n2
  } else if (p0.length === 2 && p0[0] === '0') {
    // Zero-padded "01/..." → pasti web app → DD/MM/YYYY
    day = n0; month = n1; year = n2
  } else if (p1.length === 2 && p1[0] === '0') {
    day = n0; month = n1; year = n2
  } else {
    // Ambiguous → asumsi M/D/YYYY (data Google Form lama tidak zero-padded)
    month = n0; day = n1; year = n2
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month, year }
}

function formatTglIndo(tglStr) {
  const p = normalizeTglParts(tglStr)
  if (!p) return tglStr || ''
  const d = new Date(p.year, p.month - 1, p.day)
  if (isNaN(d.getTime())) return tglStr
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]}`
}

// Parsing tanggal dari string ke Date object
function parseTanggal(tglStr) {
  const p = normalizeTglParts(tglStr)
  if (!p) return null
  const d = new Date(p.year, p.month - 1, p.day)
  return isNaN(d.getTime()) ? null : d
}

export default function Riwayat() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulanFilter, setBulanFilter] = useState('Semua')
  const [statusFilter, setStatusFilter] = useState('Semua Status')

  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || !token) { navigate('/login'); return }
    api.getRiwayat(user.id, token)
      .then(res => {
        if (res.success) {
          setRiwayat(res.data || [])
        } else {
          // Sesi expired atau error lain
          if (res.message && res.message.includes('Sesi')) {
            navigate('/login')
          } else {
            setError(res.message || 'Gagal memuat riwayat')
          }
        }
      })
      .catch(err => { console.error('Error fetching riwayat:', err); setError('Tidak dapat terhubung ke server') })
      .finally(() => setLoading(false))
  }, [user, token])

  // Filter data — gunakan parseTanggal agar cocok dengan semua format
  const filtered = riwayat.filter(item => {
    const matchStatus = statusFilter === 'Semua Status' || item.status === statusFilter
    if (bulanFilter === 'Semua') return matchStatus
    const d = parseTanggal(item.tanggal)
    if (!d) return false
    // Peta nama bulan Indonesia ke index getMonth() (0-based)
    const bulanMap = { 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11, 'Juli': 6 }
    const targetBulan = bulanMap[bulanFilter]
    const matchBulan = targetBulan !== undefined && d.getMonth() === targetBulan
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
            <option value="Agustus">Agustus 2026</option>
            <option value="September">September 2026</option>
            <option value="Oktober">Oktober 2026</option>
            <option value="November">November 2026</option>
            <option value="Desember">Desember 2026</option>
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
          ) : error ? (
             <div className="text-center text-grey text-sm mt-8">⚠️ {error}</div>
          ) : filtered.length === 0 ? (
             <div className="text-center text-grey text-sm mt-8">
               {riwayat.length === 0 ? 'Belum ada riwayat presensi' : 'Tidak ada data untuk filter ini'}
             </div>
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

