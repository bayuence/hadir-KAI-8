import React from 'react'

export default function AdminPesertaStats({ totalPeserta, totalAdmin, totalDitempatkan, totalBelumPenempatan }) {
  return (
    <div className="peserta-stats-grid">
      <div className="peserta-stat-card">
        <div className="peserta-stat-header">
          <span className="peserta-stat-lbl">Total Peserta</span>
          <div className="peserta-stat-icon-wrap icon-blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>
        <div className="peserta-stat-body">
          <span className="peserta-stat-val">{totalPeserta}</span>
          <span className="peserta-stat-hint">Akun terdaftar</span>
        </div>
      </div>

      <div className="peserta-stat-card">
        <div className="peserta-stat-header">
          <span className="peserta-stat-lbl">Administrator</span>
          <div className="peserta-stat-icon-wrap icon-purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>
        <div className="peserta-stat-body">
          <span className="peserta-stat-val">{totalAdmin}</span>
          <span className="peserta-stat-hint">Akses admin</span>
        </div>
      </div>

      <div className="peserta-stat-card">
        <div className="peserta-stat-header">
          <span className="peserta-stat-lbl">Ditempatkan</span>
          <div className="peserta-stat-icon-wrap icon-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
        <div className="peserta-stat-body">
          <span className="peserta-stat-val">{totalDitempatkan}</span>
          <span className="peserta-stat-hint">Sudah ada lokasi</span>
        </div>
      </div>

      <div className="peserta-stat-card">
        <div className="peserta-stat-header">
          <span className="peserta-stat-lbl">Belum Lokasi</span>
          <div className="peserta-stat-icon-wrap icon-amber">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>
        <div className="peserta-stat-body">
          <span className="peserta-stat-val">{totalBelumPenempatan}</span>
          <span className="peserta-stat-hint">Perlu penempatan</span>
        </div>
      </div>
    </div>
  )
}
