import React, { useState, useEffect } from 'react'
import { api } from '../../services/api'
import AdminHeader from '../../components/AdminHeader'
import BottomNav from '../../components/BottomNav'
import Avatar from '../../components/Avatar'
import AdminPesertaStats from './components/AdminPesertaStats'
import AdminPesertaModal from './components/AdminPesertaModal'
import './Admin.css'
import './AdminPeserta.css'

export default function AdminPeserta() {
  const [pesertaList, setPesertaList] = useState([])
  const [unitList, setUnitList] = useState([])
  const [lokasiList, setLokasiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', action: null, type: 'danger' })
  
  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all', 'intern', 'admin'

  // State Modal (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    nama: '',
    tanggalLahir: '',
    kampus: '',
    jurusan: '',
    noHp: '',
    email: '',
    role: 'intern',
    idLokasi: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.admin.getAllUsers ? api.admin.getAllUsers() : Promise.resolve({ success: false }),
      api.getPesertaList(),
      api.admin.getPendingUsers(),
      api.admin.getPenugasan()
    ]).then(([resAll, resActive, resPending, resPen]) => {
      if (resPen.success && resPen.data) {
        setUnitList(resPen.data.unitList || [])
        setLokasiList(resPen.data.lokasiList || [])
      }

      if (resAll.success && resAll.data && resAll.data.length > 0) {
        setPesertaList(resAll.data)
      } else {
        let combined = []
        if (resActive.success && Array.isArray(resActive.data)) {
          combined = resActive.data.map(p => ({
            ...p,
            status: 'active',
            role: p.role || 'intern'
          }))
        }
        if (resPending.success && Array.isArray(resPending.data)) {
          resPending.data.forEach(p => {
            if (!combined.some(x => x.id === p.id)) {
              combined.push({
                ...p,
                status: 'pending',
                role: 'intern'
              })
            }
          })
        }
        setPesertaList(combined)
      }
    }).catch(err => {
      console.error(err)
      showToast('Gagal memuat data', 'error')
    }).finally(() => setLoading(false))
  }

  const getLokasiName = (idLokasi) => {
    if (!idLokasi) return null
    const found = lokasiList.find(l => l.id === idLokasi)
    return found ? found.nama : idLokasi
  }

  const handleOpenAdd = () => {
    setEditingUser(null)
    setFormData({
      id: '',
      nama: '',
      tanggalLahir: '',
      kampus: '',
      jurusan: '',
      noHp: '',
      email: '',
      role: 'intern',
      idLokasi: ''
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setFormData({
      id: user.id || '',
      nama: user.nama || '',
      tanggalLahir: user.tanggalLahir || '',
      kampus: user.kampus || '',
      jurusan: user.jurusan || '',
      noHp: user.noHp || '',
      email: user.email || '',
      role: user.role || 'intern',
      idLokasi: user.idLokasi || ''
    })
    setModalOpen(true)
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    if (!formData.nama.trim()) return showToast('Nama wajib diisi!', 'error')
    if (!formData.tanggalLahir) return showToast('Tanggal lahir wajib diisi!', 'error')
    
    setSubmitting(true)
    let res
    try {
      res = await api.admin.saveUser(formData)
    } catch (err) {
      setSubmitting(false)
      showToast('Gagal menghubungi server. Pastikan Code.gs sudah di-deploy ulang.', 'error')
      return
    }
    setSubmitting(false)

    if (res && res.success) {
      showToast(res.message || 'Data berhasil disimpan!')
      setModalOpen(false)
      loadData()
    } else {
      const errMsg = res?.message || 'Gagal menyimpan data. Coba deploy ulang Code.gs.'
      showToast(errMsg, 'error')
    }
  }

  const handleDelete = async (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Peserta',
      message: `Yakin ingin menghapus peserta "${user.nama}" (${user.id})? Data akan dihapus permanen.`,
      type: 'danger',
      action: async () => {
        setActionLoading(user.id + '_delete')
        let res
        if (api.admin.deleteUser) {
          res = await api.admin.deleteUser(user.id)
        } else {
          res = await api.admin.rejectUser(user.id)
        }
        setActionLoading(null)

        if (res.success) {
          showToast('Peserta berhasil dihapus.')
          setPesertaList(prev => prev.filter(x => x.id !== user.id))
        } else {
          showToast(res.message || 'Gagal menghapus peserta', 'error')
        }
      }
    })
  }

  const handleToggleRole = async (user) => {
    const targetRole = user.role === 'admin' ? 'intern' : 'admin'
    const actionName = targetRole === 'admin' ? 'menjadikan ADMIN' : 'mengembalikan ke PESERTA MAGANG'
    
    setConfirmDialog({
      isOpen: true,
      title: 'Ubah Hak Akses',
      message: `Ubah hak akses "${user.nama}" ${actionName}?`,
      type: targetRole === 'admin' ? 'warning' : 'info',
      action: async () => {
        setActionLoading(user.id + '_role')
        let res
        if (api.admin.toggleAdminRole) {
          res = await api.admin.toggleAdminRole(user.id, targetRole)
        } else if (api.admin.saveUser) {
          res = await api.admin.saveUser({ id: user.id, role: targetRole })
        } else {
          res = { success: false, message: 'Backend belum mendukung ubah role.' }
        }
        setActionLoading(null)

        if (res.success) {
          showToast(`Role ${user.nama} diubah menjadi ${targetRole.toUpperCase()}`)
          setPesertaList(prev => prev.map(x => x.id === user.id ? { ...x, role: targetRole } : x))
        } else {
          showToast(res.message || 'Gagal mengubah role', 'error')
        }
      }
    })
  }

  const filteredPeserta = pesertaList.filter(p => {
    const q = searchQuery.toLowerCase().trim()
    const matchSearch = !q || (
      p.nama?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.kampus?.toLowerCase().includes(q) ||
      p.jurusan?.toLowerCase().includes(q)
    )
    const matchRole = roleFilter === 'all' || (p.role || 'intern') === roleFilter
    return matchSearch && matchRole
  })

  const totalPeserta = pesertaList.length
  const totalAdmin = pesertaList.filter(p => p.role === 'admin').length
  const totalDitempatkan = pesertaList.filter(p => !!p.idLokasi).length
  const totalBelumPenempatan = totalPeserta - totalDitempatkan

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title="Kelola Peserta" />

        {/* ── Toolbar Header ───────────────────────────────────── */}
        <div className="lok-toolbar" style={{ marginBottom: '16px' }}>
          <div>
            <h2 className="admin-section-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Daftar Akun & Peserta
            </h2>
            <span className="lok-count">{totalPeserta} Total Peserta Terdaftar</span>
          </div>
          <button className="lok-btn-add" onClick={handleOpenAdd}>
            + Tambah Peserta
          </button>
        </div>

        {/* ── Summary Stats Grid (Sub-komponen terpisah) ──────── */}
        <AdminPesertaStats
          totalPeserta={totalPeserta}
          totalAdmin={totalAdmin}
          totalDitempatkan={totalDitempatkan}
          totalBelumPenempatan={totalBelumPenempatan}
        />

        {/* ── Search & Filter Controls ─────────────────────────── */}
        <div className="peserta-controls">
          <div className="peserta-search-wrap">
            <svg className="peserta-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="peserta-search-input"
              type="text"
              placeholder="Cari nama, ID, kampus, jurusan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="peserta-search-clear" onClick={() => setSearchQuery('')} title="Hapus pencarian">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          <div className="peserta-select-wrap">
            <select
              className="peserta-role-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">Semua Role</option>
              <option value="intern">Hanya Magang</option>
              <option value="admin">Hanya Admin</option>
            </select>
            <svg className="peserta-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* ── Main Content List ─────────────────────────────────── */}
        {loading ? (
          <div className="admin-loading">
            <div className="spinner" /><p>Memuat data peserta...</p>
          </div>
        ) : filteredPeserta.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <p>{searchQuery ? `Tidak ada peserta cocok dengan "${searchQuery}"` : 'Belum ada data peserta.'}</p>
          </div>
        ) : (
          <div className="peserta-card-list">
            {filteredPeserta.map(user => {
              const namaLokasi = getLokasiName(user.idLokasi)
              const isAdminRole = user.role === 'admin'
              const isLoadingThis = actionLoading && actionLoading.startsWith(user.id)

              return (
                <div className={`peserta-card ${isAdminRole ? 'is-admin' : ''}`} key={user.id}>
                  <div className="peserta-card-main">
                    <div className="peserta-avatar">
                      <Avatar
                        src={user.foto}
                        name={user.nama || ''}
                        size={44}
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="peserta-card-info">
                      <div className="peserta-card-header">
                        <p className="peserta-nama" title={user.nama}>{user.nama}</p>
                        <span className={`peserta-role-badge ${isAdminRole ? 'purple' : 'blue'}`}>
                          {isAdminRole ? 'Administrator' : 'Peserta'}
                        </span>
                      </div>

                      <div className="peserta-meta-chips">
                        <span className="peserta-chip-id">{user.id}</span>
                        {user.kampus && (
                          <span className="peserta-chip-meta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                            </svg>
                            {user.kampus}
                          </span>
                        )}
                        {user.jurusan && (
                          <span className="peserta-chip-meta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                            {user.jurusan}
                          </span>
                        )}
                      </div>

                      {/* Info Lokasi */}
                      <div className="peserta-lokasi-info">
                        {namaLokasi ? (
                          <span className="peserta-lok-badge assigned">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {namaLokasi}
                          </span>
                        ) : (
                          <span className="peserta-lok-badge unassigned">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Belum Penempatan Lokasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Action Buttons Bar ─────────────────────────────── */}
                  <div className="peserta-card-actions">
                    <button
                      className="peserta-act-btn edit"
                      onClick={() => handleOpenEdit(user)}
                      disabled={isLoadingThis}
                      title="Edit Data"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                      Edit
                    </button>

                    <button
                      className={`peserta-act-btn role ${isAdminRole ? 'demote' : 'promote'}`}
                      onClick={() => handleToggleRole(user)}
                      disabled={isLoadingThis}
                      title={isAdminRole ? 'Jadikan Peserta Biasa' : 'Jadikan Admin'}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      {isAdminRole ? 'Ubah ke Intern' : 'Jadikan Admin'}
                    </button>

                    <button
                      className="peserta-act-btn delete"
                      onClick={() => handleDelete(user)}
                      disabled={isLoadingThis}
                      title="Hapus Peserta"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                      Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal Tambah/Edit (Sub-komponen terpisah) ───────────── */}
      <AdminPesertaModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        handleSaveForm={handleSaveForm}
        submitting={submitting}
        unitList={unitList}
        lokasiList={lokasiList}
      />

      {/* ── Modal Konfirmasi Custom ────────────────────────────── */}
      {confirmDialog.isOpen && (
        <div className="admin-modal-overlay active" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>
          <div className="admin-modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className={`confirm-icon ${confirmDialog.type}`}>
              {confirmDialog.type === 'danger' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              ) : confirmDialog.type === 'warning' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              )}
            </div>
            <h3 className="confirm-title">{confirmDialog.title}</h3>
            <p className="confirm-msg">{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>Batal</button>
              <button 
                className={`confirm-btn-ok ${confirmDialog.type}`}
                onClick={() => {
                  if(confirmDialog.action) confirmDialog.action()
                  setConfirmDialog({ ...confirmDialog, isOpen: false })
                }}
              >
                Yakin & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>{toast.msg}</div>
      )}
      <BottomNav active="profil" />
    </div>
  )
}
