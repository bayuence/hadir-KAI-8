import React, { useState, useEffect } from 'react'
import { api } from '../../services/api'
import AdminHeader from '../../components/AdminHeader'
import BottomNav from '../../components/BottomNav'
import './Admin.css'
import './AdminLokasi.css'

export default function AdminLokasi() {
  const [activeTab, setActiveTab] = useState('penugasan')
  const [unitList, setUnitList] = useState([])
  const [lokasiList, setLokasiList] = useState([])
  const [pesertaList, setPesertaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [editData, setEditData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [assignLoading, setAssignLoading] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.admin.getPenugasan(),
      api.getPesertaList()
    ]).then(([resPen, resPes]) => {
      if (resPen.success && resPen.data) {
        setUnitList(resPen.data.unitList || [])
        setLokasiList(resPen.data.lokasiList || [])
      }
      if (resPes.success) setPesertaList(resPes.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const openAddUnit = () => {
    setEditData({ tipe: 'unit_kerja', id: '', nama: '' })
    setModal('unit')
  }
  const openEditUnit = (u) => {
    setEditData({ tipe: 'unit_kerja', id: u.id, nama: u.nama })
    setModal('unit')
  }
  const openAddLokasi = (idInduk) => {
    setEditData({ tipe: 'lokasi', id: '', idInduk, nama: '', alamat: '', lat: '', lng: '', radius: '100' })
    setModal('lokasi')
  }
  const openEditLokasi = (lok) => {
    setEditData({
      tipe: 'lokasi', id: lok.id, idInduk: lok.idInduk,
      nama: lok.nama, alamat: lok.alamat || '',
      lat: lok.lat || '', lng: lok.lng || '', radius: String(lok.radius || 100)
    })
    setModal('lokasi')
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) return alert('Browser tidak mendukung Geolocation')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setEditData(prev => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        }))
        setGpsLoading(false)
        showToast('Koordinat GPS berhasil diambil')
      },
      err => { setGpsLoading(false); alert('Gagal ambil GPS: ' + err.message) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editData.nama.trim()) return
    setSubmitting(true)
    const res = await api.admin.savePenugasan({
      id: editData.id || undefined,
      tipe: editData.tipe,
      idInduk: editData.idInduk || '',
      nama: editData.nama.trim(),
      alamat: editData.alamat || '',
      lat: editData.lat || '',
      lng: editData.lng || '',
      radius: parseInt(editData.radius) || ''
    })
    setSubmitting(false)
    if (res.success) { showToast(res.message || 'Berhasil disimpan'); setModal(null); loadData() }
    else alert(res.message || 'Gagal menyimpan')
  }

  const handleDelete = async (id, nama, tipe) => {
    const msg = tipe === 'unit_kerja'
      ? `Hapus unit kerja "${nama}"? Semua lokasi di bawahnya ikut terhapus.`
      : `Hapus lokasi "${nama}"?`
    if (!window.confirm(msg)) return
    const res = await api.admin.deletePenugasan(id)
    if (res.success) { showToast('Berhasil dihapus'); loadData() }
    else alert(res.message || 'Gagal menghapus')
  }

  const handleAssign = async (idPeserta, idLokasi) => {
    setAssignLoading(idPeserta)
    const res = await api.admin.assignLokasi(idPeserta, idLokasi)
    setAssignLoading(null)
    if (res.success) showToast('Penempatan diperbarui')
    else alert(res.message || 'Gagal')
  }

  return (
    <div className="app-shell">
      <div className="admin-wrap">
        <AdminHeader title="Unit Kerja & Penempatan" />

        {/* Tab */}
        <div className="lok-tabs">
          <button className={`lok-tab ${activeTab === 'penugasan' ? 'active' : ''}`}
            onClick={() => setActiveTab('penugasan')}>
            Unit Kerja & Lokasi
          </button>
          <button className={`lok-tab ${activeTab === 'penempatan' ? 'active' : ''}`}
            onClick={() => setActiveTab('penempatan')}>
            Penempatan Peserta
          </button>
        </div>

        {/* ── TAB 1 ─────────────────────────────────────────────── */}
        {activeTab === 'penugasan' && (
          <>
            {/* Toolbar */}
            <div className="lok-toolbar">
              <span className="lok-count">{unitList.length} Unit Kerja · {lokasiList.length} Lokasi</span>
              <button className="lok-btn-add" onClick={openAddUnit}>+ Tambah Unit Kerja</button>
            </div>

            {loading ? (
              <div className="admin-loading"><div className="spinner" /><p>Memuat...</p></div>
            ) : unitList.length === 0 ? (
              <div className="admin-empty"><p>Belum ada unit kerja.</p></div>
            ) : (
              <div className="lok-list">
                {unitList.map(unit => {
                  const children = lokasiList.filter(l => l.idInduk === unit.id)
                  return (
                    <div className="lok-unit-card" key={unit.id}>
                      {/* Header unit */}
                      <div className="lok-unit-header">
                        <div className="lok-unit-meta">
                          <span className="lok-unit-id">{unit.id}</span>
                          <span className="lok-unit-name">{unit.nama}</span>
                        </div>
                        <div className="lok-unit-actions">
                          <button className="lok-btn-child" onClick={() => openAddLokasi(unit.id)}>
                            + Lokasi
                          </button>
                          <button className="lok-icon-btn" onClick={() => openEditUnit(unit)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="lok-icon-btn danger" onClick={() => handleDelete(unit.id, unit.nama, 'unit_kerja')} title="Hapus">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Anak lokasi */}
                      {children.length === 0 ? (
                        <p className="lok-empty-child">Belum ada lokasi di unit ini.</p>
                      ) : (
                        children.map(lok => (
                          <div className="lok-child-row" key={lok.id}>
                            <div className="lok-child-pin">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                            </div>
                            <div className="lok-child-info">
                              <div className="lok-child-top">
                                <div>
                                  <span className="lok-child-id">{lok.id}</span>
                                  <p className="lok-child-name">{lok.nama}</p>
                                  {lok.alamat && <p className="lok-child-addr">{lok.alamat}</p>}
                                </div>
                                <div className="lok-child-btns">
                                  <button className="lok-icon-btn sm" onClick={() => openEditLokasi(lok)} title="Edit">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                  </button>
                                  <button className="lok-icon-btn sm danger" onClick={() => handleDelete(lok.id, lok.nama, 'lokasi')} title="Hapus">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="lok-chips">
                                {lok.lat && (
                                  <span className="lok-chip blue">{Number(lok.lat).toFixed(4)}, {Number(lok.lng).toFixed(4)}</span>
                                )}
                                <span className="lok-chip green">Radius {lok.radius}m</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB 2 ─────────────────────────────────────────────── */}
        {activeTab === 'penempatan' && (
          <>
            <div className="lok-info-box">
              Lokasi peserta dapat diubah kapan saja sesuai jadwal penugasan harian.
            </div>
            {loading ? (
              <div className="admin-loading"><div className="spinner" /><p>Memuat...</p></div>
            ) : pesertaList.length === 0 ? (
              <div className="admin-empty"><p>Belum ada peserta aktif.</p></div>
            ) : (
              <div className="lok-assign-list">
                {pesertaList.map(p => (
                  <div className="lok-assign-row" key={p.id}>
                    <div className="lok-assign-avatar">{p.nama?.charAt(0)?.toUpperCase()}</div>
                    <div className="lok-assign-info">
                      <p className="lok-assign-name">{p.nama}</p>
                      <p className="lok-assign-id">{p.id}</p>
                    </div>
                    <div className="lok-assign-select">
                      <select
                        disabled={assignLoading === p.id}
                        value={p.idLokasi || ''}
                        onChange={e => {
                          const val = e.target.value
                          setPesertaList(prev => prev.map(x => x.id === p.id ? { ...x, idLokasi: val } : x))
                          handleAssign(p.id, val)
                        }}
                      >
                        <option value="">Pilih Lokasi</option>
                        {unitList.map(unit => (
                          <optgroup key={unit.id} label={unit.nama}>
                            {lokasiList.filter(l => l.idInduk === unit.id).map(lok => (
                              <option key={lok.id} value={lok.id}>{lok.nama}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL UNIT KERJA ─────────────────────────────────── */}
      {modal === 'unit' && (
        <div className="lok-overlay" onClick={() => setModal(null)}>
          <div className="lok-modal" onClick={e => e.stopPropagation()}>
            <div className="lok-modal-header">
              <h3>{editData.id ? 'Edit Unit Kerja' : 'Tambah Unit Kerja'}</h3>
              <button className="lok-close" onClick={() => setModal(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="lok-form-group">
                <label>Nama Unit Kerja</label>
                <input
                  type="text"
                  placeholder="Misal: Unit Operasi"
                  value={editData.nama}
                  onChange={e => setEditData({ ...editData, nama: e.target.value })}
                  required autoFocus
                />
              </div>
              <div className="lok-modal-footer">
                <button type="button" className="lok-btn-cancel" onClick={() => setModal(null)}>Batal</button>
                <button type="submit" className="lok-btn-save" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL LOKASI ─────────────────────────────────────── */}
      {modal === 'lokasi' && (
        <div className="lok-overlay" onClick={() => setModal(null)}>
          <div className="lok-modal" onClick={e => e.stopPropagation()}>
            <div className="lok-modal-header">
              <div>
                <h3>{editData.id ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
                <span className="lok-modal-sub">
                  {unitList.find(u => u.id === editData.idInduk)?.nama}
                </span>
              </div>
              <button className="lok-close" onClick={() => setModal(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="lok-form-group">
                <label>Nama Lokasi / Tempat</label>
                <input type="text"
                  placeholder="Misal: Dipo Lokomotif Sidotopo"
                  value={editData.nama}
                  onChange={e => setEditData({ ...editData, nama: e.target.value })}
                  required autoFocus />
              </div>
              <div className="lok-form-group">
                <label>Alamat</label>
                <input type="text"
                  placeholder="Alamat lengkap lokasi"
                  value={editData.alamat}
                  onChange={e => setEditData({ ...editData, alamat: e.target.value })} />
              </div>
              <div className="lok-form-row">
                <div className="lok-form-group">
                  <label>Latitude</label>
                  <input type="text" placeholder="-7.2351"
                    value={editData.lat}
                    onChange={e => setEditData({ ...editData, lat: e.target.value })} />
                </div>
                <div className="lok-form-group">
                  <label>Longitude</label>
                  <input type="text" placeholder="112.7612"
                    value={editData.lng}
                    onChange={e => setEditData({ ...editData, lng: e.target.value })} />
                </div>
              </div>
              <button type="button" className="lok-gps-btn" onClick={handleGetGPS} disabled={gpsLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                {gpsLoading ? 'Mengambil GPS...' : 'Gunakan Koordinat GPS Saya'}
              </button>
              <div className="lok-form-group">
                <label>Radius Presensi (Meter)</label>
                <input type="number" placeholder="100"
                  value={editData.radius}
                  onChange={e => setEditData({ ...editData, radius: e.target.value })}
                  required />
                <p className="lok-hint">Peserta harus berada dalam jarak ini saat presensi.</p>
              </div>
              <div className="lok-modal-footer">
                <button type="button" className="lok-btn-cancel" onClick={() => setModal(null)}>Batal</button>
                <button type="submit" className="lok-btn-save" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`admin-toast admin-toast-${toast.type}`}>{toast.msg}</div>}
      <BottomNav active="profil" />
    </div>
  )
}
