import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import BottomNav from '../components/BottomNav'
import Avatar from '../components/Avatar'
import AdminHeader from '../components/AdminHeader'
import NotificationPrompt from '../components/NotificationPrompt'
import './Profil.css'

export default function Profil() {
  const { user, token, logoutContext, updateUserContext } = useAuth()
  const navigate = useNavigate()
  const [profileData, setProfileData] = useState(null)
  const isAdmin = user?.role === 'admin'

  // ─── State: Modal Ganti Lokasi ────────────────────────────────
  const [showLokasiModal, setShowLokasiModal] = useState(false)
  const [lokasiOptions, setLokasiOptions] = useState({ unitList: [], lokasiList: [] })
  const [lokasiLoading, setLokasiLoading] = useState(false)
  const [lokasiSaving, setLokasiSaving] = useState(false)
  const [selectedLokasi, setSelectedLokasi] = useState('')
  const [lokasiToast, setLokasiToast] = useState(null)

  const showLokasiToast = (msg, type = 'success') => {
    setLokasiToast({ msg, type })
    setTimeout(() => setLokasiToast(null), 3000)
  }

  const openLokasiModal = () => {
    const currentIdLokasi = (profileData?.idLokasi) || (user?.idLokasi) || ''
    setShowLokasiModal(true)
    setSelectedLokasi(currentIdLokasi)
    // Jika belum ada data, fetch sekarang (jarang terjadi karena sudah prefetch)
    if (lokasiOptions.lokasiList.length === 0 && !lokasiLoading) {
      setLokasiLoading(true)
      api.getPenugasanPublic().then(res => {
        setLokasiLoading(false)
        if (res.success && res.data) setLokasiOptions(res.data)
      }).catch(() => setLokasiLoading(false))
    }
  }

  const handleSimpanLokasi = async () => {
    if (!selectedLokasi) return
    setLokasiSaving(true)
    const res = await api.selfAssignLokasi(selectedLokasi, token)
    setLokasiSaving(false)
    if (res.success && res.data) {
      updateUserContext(res.data)           // update context & localStorage
      setProfileData(prev => prev ? { ...prev, ...res.data } : res.data)
      setShowLokasiModal(false)
      showLokasiToast('Lokasi penugasan berhasil diperbarui ✅')
    } else {
      showLokasiToast(res.message || 'Gagal memperbarui lokasi', 'error')
    }
  }

  useEffect(() => {
    let isMounted = true
    if (!user?.id || !token) return
    
    api.getProfile(user.id, token)
      .then(res => {
        if (!isMounted) return
        if (res.success && res.data) {
          // Simpan data mentah — Avatar component yang akan konversi URL foto
          // Jangan panggil loginContext dari sini untuk menghindari loop re-render
          setProfileData(res.data)
        }
      })
      .catch(() => {})
      
    return () => { isMounted = false }
  }, [user?.id, token])

  // Prefetch daftar lokasi di background saat halaman dimuat
  // agar modal langsung muncul tanpa loading saat tombol "Ganti" diklik
  useEffect(() => {
    let isMounted = true
    if (!user?.id) return
    api.getPenugasanPublic().then(res => {
      if (!isMounted) return
      if (res.success && res.data) setLokasiOptions(res.data)
    }).catch(() => {})
    return () => { isMounted = false }
  }, [user?.id])

  // Merge data: profileData override semua field dari user context
  // Biarkan Avatar component yang handle konversi URL foto
  const profile = profileData
    ? { ...user, ...profileData }
    : (user || null)

  return (
    <div className="app-shell">
      {/* ── Page Content ──────────────────────────────────── */}
      <div className="profil-wrap">
        <AdminHeader title="Profil Akun" />

        {profile && (
          <div className="profil-card">
            <Avatar
              src={profile.foto}
              name={profile.nama}
              size={88}
              style={{ border: '3px solid #e5e7eb', margin: '0 auto 12px' }}
            />
            <p className="profil-nama">{profile.nama}</p>
            <p className="profil-lokasi">{profile.lokasi || '—'}</p>
            <span className={`profil-role-badge ${isAdmin ? 'badge-admin' : 'badge-intern'}`}>
              {isAdmin ? 'Administrator' : 'Peserta Magang'}
            </span>
          </div>
        )}

        {/* Section 1: Informasi Magang & Penugasan */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Informasi Magang & Penugasan</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">ID Peserta / Magang</p>
                <p className="profil-info-val">{profile?.id || '—'}</p>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Unit Kerja</p>
                <p className="profil-info-val">{profile?.unitKerja || '—'}</p>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <div className="profil-lokasi-row">
                <div>
                  <p className="profil-info-label">Lokasi Magang</p>
                  <p className="profil-info-val">{profile?.lokasi || 'Belum ditetapkan'}</p>
                </div>
                <button
                  className="profil-ganti-lokasi-btn"
                  onClick={openLokasiModal}
                  title="Ganti Lokasi Penugasan"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Ganti
                </button>
              </div>
            </div>

            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Periode Magang</p>
                <p className="profil-info-val">
                  {profile?.mulaiMagang || '—'} {profile?.selesaiMagang ? `s.d. ${profile.selesaiMagang}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Data Pribadi & Kontak */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Informasi Pribadi & Kontak</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Tanggal Lahir (PIN Login)</p>
                <p className="profil-info-val">{profile?.tanggalLahir || profile?.tglLahir || profile?.tanggal_lahir || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">No. HP / WhatsApp</p>
                <p className="profil-info-val">{profile?.noHp || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Email</p>
                <p className="profil-info-val">{profile?.email || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Alamat Domisili</p>
                <p className="profil-info-val">{profile?.alamat || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pendidikan */}
        <div className="profil-section-card">
          <h3 className="profil-section-title">Pendidikan & Asal Instansi</h3>
          <div className="profil-info-list">
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Kampus / Sekolah</p>
                <p className="profil-info-val">{profile?.kampus || '—'}</p>
              </div>
            </div>
            <div className="profil-info-item">
              <span className="profil-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </span>
              <div>
                <p className="profil-info-label">Jurusan</p>
                <p className="profil-info-val">{profile?.jurusan || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pengaturan Notifikasi (Sementara hanya admin) */}
        {isAdmin && <NotificationPrompt />}

        <button
          className="btn btn-outline"
          style={{
            borderColor: '#8b5cf6',
            color: '#7c3aed',
            background: 'rgba(139, 92, 246, 0.05)',
            marginTop: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
          onClick={() => navigate('/facetest')}
        >
          <span style={{ fontSize: 18 }}>🧠</span>
          Uji Coba AI Face Recognition (Face ID)
        </button>

        <button
          className="btn btn-outline"
          style={{
            borderColor: '#e2e8f0',
            color: '#475569',
            marginTop: 8,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#f8fafc'
          }}
          onClick={() => navigate('/tentang')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Tentang Aplikasi
        </button>

        <button className="btn btn-outline"
          style={{ color: 'var(--red)', borderColor: 'var(--red)', marginTop: 8, width: '100%' }}
          onClick={() => { logoutContext(); navigate('/login'); }}>
          Keluar dari Akun
        </button>
      </div>

      {/* ── Modal Ganti Lokasi Penugasan ─────────────────────── */}
      {showLokasiModal && (
        <div className="lok-modal-backdrop" onClick={() => setShowLokasiModal(false)}>
          <div className="lok-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="lok-sheet-handle" />
            <div className="lok-sheet-header">
              <div>
                <h3 className="lok-sheet-title">Pilih Lokasi Penugasan</h3>
                <p className="lok-sheet-sub">Pilih lokasi tempat kamu bertugas sekarang</p>
              </div>
              <button className="lok-sheet-close" onClick={() => setShowLokasiModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="lok-sheet-body">
              {lokasiLoading ? (
                <div className="lok-sheet-loading">
                  <div className="spinner" />
                  <p>Memuat daftar lokasi...</p>
                </div>
              ) : lokasiOptions.lokasiList.length === 0 ? (
                <div className="lok-sheet-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <p>Belum ada lokasi yang tersedia.<br/>Hubungi admin untuk menambahkan lokasi.</p>
                </div>
              ) : (
                lokasiOptions.unitList.map(unit => {
                  const children = lokasiOptions.lokasiList.filter(l => l.idInduk === unit.id)
                  if (children.length === 0) return null
                  return (
                    <div key={unit.id} className="lok-sheet-group">
                      <p className="lok-sheet-group-label">{unit.nama}</p>
                      {children.map(lok => {
                        const isActive = selectedLokasi === lok.id
                        return (
                          <button
                            key={lok.id}
                            className={`lok-sheet-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSelectedLokasi(lok.id)}
                          >
                            <div className="lok-sheet-item-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                            </div>
                            <div className="lok-sheet-item-info">
                              <p className="lok-sheet-item-name">{lok.nama}</p>
                              {lok.alamat && <p className="lok-sheet-item-addr">{lok.alamat}</p>}
                              <p className="lok-sheet-item-radius">Radius {lok.radius}m</p>
                            </div>
                            {isActive && (
                              <svg className="lok-sheet-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            <div className="lok-sheet-footer">
              <button className="lok-sheet-btn-cancel" onClick={() => setShowLokasiModal(false)}>Batal</button>
              <button
                className={`lok-sheet-btn-save ${lokasiSaving ? 'loading' : ''}`}
                onClick={handleSimpanLokasi}
                disabled={!selectedLokasi || lokasiSaving || selectedLokasi === ((profileData?.idLokasi) || (user?.idLokasi) || '')}
              >
                {lokasiSaving ? <span className="spinner" /> : 'Simpan Lokasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lokasiToast && (
        <div className={`profil-toast ${lokasiToast.type === 'error' ? 'profil-toast-error' : 'profil-toast-success'}`}>
          {lokasiToast.msg}
        </div>
      )}

      <BottomNav active="profil" />
    </div>
  )
}
