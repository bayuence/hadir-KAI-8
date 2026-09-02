import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import './Admin.css'

export default function AdminIzin() {
  const navigate = useNavigate()
  const [izinList, setIzinList] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { loadIzin() }, [])

  const loadIzin = () => {
    setLoading(true)
    api.admin.getPendingIzin()
      .then(d => { if (d.success) setIzinList(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve')
    const res = await api.admin.approveIzin(id)
    if (res.success) {
      showToast('Izin disetujui!')
      setIzinList(prev => prev.filter(i => i.id !== id))
    } else showToast(res.message || 'Gagal', 'error')
    setActionLoading(null)
  }

  const handleReject = async (id) => {
    setActionLoading(id + '_reject')
    const res = await api.admin.rejectIzin(id)
    if (res.success) {
      showToast('Izin ditolak.', 'error')
      setIzinList(prev => prev.filter(i => i.id !== id))
    } else showToast(res.message || 'Gagal', 'error')
    setActionLoading(null)
  }

  const jenisColor = {
    'sakit': '#ef4444', 'keperluan': '#f59e0b', 'lainnya': '#6366f1'
  }

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <div className="admin-page-header">
          <button className="admin-back-btn" onClick={() => navigate('/profil')}>
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <path d="M12 4l-7 6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="admin-page-title">Kelola Izin</h1>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="spinner"/><p>Memuat...</p></div>
        ) : izinList.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📋</div>
            <p>Tidak ada pengajuan izin yang menunggu.</p>
          </div>
        ) : (
          <div className="admin-card-list">
            {izinList.map(iz => (
              <div className="admin-izin-card" key={iz.id}>
                <div className="admin-izin-top">
                  <div>
                    <p className="admin-peserta-nama">{iz.namaPeserta || '—'}</p>
                    <p className="admin-peserta-meta">{iz.tanggal}</p>
                  </div>
                  <span
                    className="admin-jenis-chip"
                    style={{ background: jenisColor[iz.jenis] + '22', color: jenisColor[iz.jenis] }}
                  >
                    {iz.jenis}
                  </span>
                </div>
                {iz.alasan && (
                  <p className="admin-izin-alasan">"{iz.alasan}"</p>
                )}
                <div className="admin-peserta-actions">
                  <button
                    className="btn-icon btn-icon-green"
                    disabled={!!actionLoading}
                    onClick={() => handleApprove(iz.id)}
                  >
                    {actionLoading === iz.id + '_approve' ? '...' : '✓ Setuju'}
                  </button>
                  <button
                    className="btn-icon btn-icon-red"
                    disabled={!!actionLoading}
                    onClick={() => handleReject(iz.id)}
                  >
                    {actionLoading === iz.id + '_reject' ? '...' : '✕ Tolak'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className={`admin-toast admin-toast-${toast.type}`}>{toast.msg}</div>}
      <BottomNav active="profil" />
    </div>
  )
}
