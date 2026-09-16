import React, { useMemo } from 'react'

/**
 * Konversi DD/MM/YYYY → YYYY-MM-DD (untuk value input[type=date])
 */
function toIsoDate(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  // Sudah format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(ddmmyyyy)) return ddmmyyyy
  // Format DD/MM/YYYY atau D/M/YYYY
  const parts = ddmmyyyy.split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return ''
}

/**
 * Konversi YYYY-MM-DD → DD/MM/YYYY (untuk disimpan ke backend)
 */
function toDdMmYyyy(isoDate) {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}/${m}/${y}`
  }
  return isoDate
}

export default function AdminPesertaModal({
  modalOpen,
  setModalOpen,
  editingUser,
  formData,
  setFormData,
  handleSaveForm,
  submitting,
  unitList,
  lokasiList
}) {
  if (!modalOpen) return null

  // Nilai input date dalam format ISO (YYYY-MM-DD) agar date picker berfungsi
  const dateValue = useMemo(() => toIsoDate(formData.tanggalLahir), [formData.tanggalLahir])

  const handleDateChange = (e) => {
    // Simpan ke formData dalam format DD/MM/YYYY agar kompatibel dengan backend
    setFormData({ ...formData, tanggalLahir: toDdMmYyyy(e.target.value) })
  }

  return (
    <div className="lok-overlay" onClick={() => setModalOpen(false)}>
      <div
        className="lok-modal"
        style={{ maxWidth: '430px', borderRadius: '20px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lok-modal-header">
          <div>
            <h3>{editingUser ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}</h3>
            {editingUser && <span className="lok-modal-sub">ID: {editingUser.id}</span>}
          </div>
          <button className="lok-close" onClick={() => setModalOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSaveForm}>
          {/* Nama */}
          <div className="lok-form-group">
            <label>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              placeholder="Misal: Budi Santoso"
              value={formData.nama}
              onChange={e => setFormData({ ...formData, nama: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="lok-form-row">
            {/* Tanggal Lahir — Date Picker Modern */}
            <div className="lok-form-group">
              <label>
                Tanggal Lahir <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={dateValue}
                  onChange={handleDateChange}
                  max={new Date().toISOString().split('T')[0]}
                  min="1970-01-01"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#fafafa',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                {formData.tanggalLahir && (
                  <span style={{
                    position: 'absolute', right: 0, top: '100%',
                    fontSize: '11px', color: '#64748b', marginTop: '3px',
                    whiteSpace: 'nowrap'
                  }}>
                    📅 {formData.tanggalLahir}
                  </span>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="lok-form-group">
              <label>Hak Akses / Role</label>
              <select
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fafafa', fontSize: '0.85rem', cursor: 'pointer' }}
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="intern">Peserta Magang</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="lok-form-row">
            <div className="lok-form-group">
              <label>Kampus / Universitas</label>
              <input
                type="text"
                placeholder="Misal: Universitas Airlangga"
                value={formData.kampus}
                onChange={e => setFormData({ ...formData, kampus: e.target.value })}
              />
            </div>
            <div className="lok-form-group">
              <label>Jurusan</label>
              <input
                type="text"
                placeholder="Misal: Teknik Informatika"
                value={formData.jurusan}
                onChange={e => setFormData({ ...formData, jurusan: e.target.value })}
              />
            </div>
          </div>

          <div className="lok-form-row">
            <div className="lok-form-group">
              <label>No. HP / WhatsApp</label>
              <input
                type="tel"
                placeholder="081234567890"
                value={formData.noHp}
                onChange={e => setFormData({ ...formData, noHp: e.target.value })}
              />
            </div>
            <div className="lok-form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="lok-form-group">
            <label>Lokasi Penempatan Kerja</label>
            <select
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fafafa', fontSize: '0.85rem', cursor: 'pointer' }}
              value={formData.idLokasi}
              onChange={e => setFormData({ ...formData, idLokasi: e.target.value })}
            >
              <option value="">-- Belum Ada Lokasi --</option>
              {unitList.map(unit => (
                <optgroup key={unit.id} label={unit.nama}>
                  {lokasiList.filter(l => l.idInduk === unit.id).map(lok => (
                    <option key={lok.id} value={lok.id}>{lok.nama}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="lok-modal-footer">
            <button type="button" className="lok-btn-cancel" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="lok-btn-save" disabled={submitting}>
              {submitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Simpan Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

