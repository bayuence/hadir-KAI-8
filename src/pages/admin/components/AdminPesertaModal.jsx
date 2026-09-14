import React from 'react'

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

  return (
    <div className="lok-overlay" onClick={() => setModalOpen(false)}>
      <div className="lok-modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
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
          <div className="lok-form-group">
            <label>Nama Lengkap *</label>
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
            <div className="lok-form-group">
              <label>Tgl Lahir (DD/MM/YYYY) *</label>
              <input
                type="text"
                placeholder="15/08/2002"
                value={formData.tanggalLahir}
                onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
                required
              />
            </div>
            <div className="lok-form-group">
              <label>Hak Akses / Role</label>
              <select
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fafafa', fontSize: '0.85rem' }}
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
                type="text"
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fafafa', fontSize: '0.85rem' }}
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
              {submitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
