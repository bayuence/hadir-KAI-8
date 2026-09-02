import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Daftar from './pages/Daftar'
import Dashboard from './pages/Dashboard'
import Riwayat from './pages/Riwayat'
import Izin from './pages/Izin'
import Profil from './pages/Profil'
import Presensi from './pages/Presensi'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPeserta from './pages/admin/AdminPeserta'
import AdminPresensi from './pages/admin/AdminPresensi'
import AdminIzin from './pages/admin/AdminIzin'

// Guard: hanya bisa diakses jika belum login
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-shell" />
  // Semua user (admin & intern) diarahkan ke dashboard yang sama
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

// Guard: hanya bisa diakses jika sudah login
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-shell" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Guard: hanya bisa diakses jika role === admin
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-shell" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Halaman publik */}
          <Route path="/" element={<PublicRoute><Onboarding /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/daftar" element={<PublicRoute><Daftar /></PublicRoute>} />

          {/* Halaman peserta (perlu login) */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/riwayat" element={<PrivateRoute><Riwayat /></PrivateRoute>} />
          <Route path="/izin" element={<PrivateRoute><Izin /></PrivateRoute>} />
          <Route path="/profil" element={<PrivateRoute><Profil /></PrivateRoute>} />
          <Route path="/presensi/masuk" element={<PrivateRoute><Presensi type="masuk" /></PrivateRoute>} />
          <Route path="/presensi/pulang" element={<PrivateRoute><Presensi type="pulang" /></PrivateRoute>} />

          {/* Halaman admin (perlu login & role admin) */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/peserta" element={<AdminRoute><AdminPeserta /></AdminRoute>} />
          <Route path="/admin/presensi" element={<AdminRoute><AdminPresensi /></AdminRoute>} />
          <Route path="/admin/izin" element={<AdminRoute><AdminIzin /></AdminRoute>} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
