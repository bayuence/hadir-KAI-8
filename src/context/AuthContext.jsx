import React, { createContext, useContext, useState, useEffect } from 'react'
import { driveAvatarUrl } from '../utils/driveImage'
import { api } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load auth from storage on mount secara instan (0 detik)
    const storedUser = localStorage.getItem('kai_user')
    const storedToken = localStorage.getItem('kai_token')
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.foto) {
          const convertedFoto = driveAvatarUrl(parsedUser.foto)
          if (convertedFoto && convertedFoto !== parsedUser.foto) {
            // Migrasi URL foto lama ke format lh3 baru — simpan balik ke localStorage
            parsedUser.foto = convertedFoto
            try { localStorage.setItem('kai_user', JSON.stringify(parsedUser)) } catch (_) {}
          }
        }
        setUser(parsedUser)
        setToken(storedToken)

        // Background sync: Ambil data profil & foto terbaru dari backend agar selalu sinkron
        // Tanpa loading spinner / tanpa memblokir tampilan aplikasi
        api.getProfile(parsedUser.id, storedToken)
          .then(res => {
            // Pastikan token di storage masih sama (belum ada login/logout baru)
            const currentToken = localStorage.getItem('kai_token')
            if (currentToken !== storedToken) return // Sesi sudah berubah, abaikan

            if (res.success && res.data) {
              const freshFoto = res.data.foto ? (driveAvatarUrl(res.data.foto) || res.data.foto) : parsedUser.foto
              const updatedUser = { ...parsedUser, ...res.data, foto: freshFoto }
              setUser(updatedUser)
              localStorage.setItem('kai_user', JSON.stringify(updatedUser))
            } else if (res.message && res.message.includes('Sesi')) {
              // Jika sesi backend kedaluwarsa, bersihkan sesi agar tidak ada bug status gantung
              // Hanya logout jika token di storage masih sama (belum ada aksi login baru)
              if (localStorage.getItem('kai_token') === storedToken) {
                logoutContext()
              }
            }
          })
          .catch(() => {})
      } catch (e) {
        console.error('Failed to parse stored user:', e)
        // Bersihkan data korup
        localStorage.removeItem('kai_user')
        localStorage.removeItem('kai_token')
      }
    }
    setLoading(false)
  }, [])


  const loginContext = (userData, userToken) => {
    // Konversi foto ke format lh3 Safari/PWA-safe saat login
    const userToSave = { ...userData }
    if (userToSave.foto) {
      userToSave.foto = driveAvatarUrl(userToSave.foto) || userToSave.foto
    }
    setUser(userToSave)
    setToken(userToken)
    localStorage.setItem('kai_user', JSON.stringify(userToSave))
    localStorage.setItem('kai_token', userToken)
  }

  const logoutContext = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('kai_user')
    localStorage.removeItem('kai_token')
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kai_status_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (_) {}
  }

  return (
    <AuthContext.Provider value={{ user, token, loginContext, logoutContext, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
