import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import './Admin.css'

export default function AdminPeserta() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadPending()
  }, [])

  const loadPending = () => {
    setLoading(true)
    api.admin.getPendingUsers()
      .then(d => { if (d.success) setPendingList(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve')
    const res = await api.admin.approveUser(id, '')
    if (res.success) {
      showToast('Peserta disetujui!')
      setPendingList(prev => prev.filter(p => p.id !== id))
    } else {
      showToast(res.message || 'Gagal', 'error')
    }
    setActionLoading(null)
  }

  const handleReject = async (id) => {
    if (!window.confirm('Tolak pendaftaran ini?')) return
    setActionLoading(id + '_reject')
    const res = await api.admin.rejectUser(id)
    if (res.success) {
      showToast('Peserta ditolak.', 'error')
      setPendingList(prev => prev.filter(p => p.id !== id))
    } else {
      showToast(res.message || 'Gagal', 'error')
    }
    setActionLoading(null)
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
          <h1 className="admin-page-title">Kelola Peserta</h1>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="spinner" /><p>Memuat data...</p>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">✅</div>
            <p>Tidak ada pendaftaran yang menunggu persetujuan.</p>
          </div>
        ) : (
          <>
            <p className="admin-section-label">{pendingList.length} pendaftaran menunggu persetujuan</p>
            <div className="admin-card-list">
              {pendingList.map(p => (
                <div className="admin-peserta-card" key={p.id}>
                  <div className="admin-peserta-avatar">{p.nama?.charAt(0)?.toUpperCase()}</div>
                  <div className="admin-peserta-info">
                    <p className="admin-peserta-nama">{p.nama}</p>
                    <p className="admin-peserta-meta">{p.kampus || '—'} · {p.jurusan || '—'}</p>
                    <p className="admin-peserta-meta">Tgl Lahir: {p.tanggalLahir || 'belum diisi'}</p>
                    <span className="badge badge-amber">Menunggu</span>
                  </div>
                  <div className="admin-peserta-actions">
                    <button
                      className="btn-icon btn-icon-green"
                      disabled={!!actionLoading}
                      onClick={() => handleApprove(p.id)}
                      title="Setujui"
                    >
                      {actionLoading === p.id + '_approve' ? '...' : '✓'}
                    </button>
                    <button
                      className="btn-icon btn-icon-red"
                      disabled={!!actionLoading}
                      onClick={() => handleReject(p.id)}
                      title="Tolak"
                    >
                      {actionLoading === p.id + '_reject' ? '...' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>{toast.msg}</div>
      )}
      <BottomNav active="profil" />
    </div>
  )
}
