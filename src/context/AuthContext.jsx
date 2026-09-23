import React, { createContext, useContext, useState, useEffect } from 'react'
import { driveAvatarUrl } from '../utils/driveImage'
import { api } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load auth dari storage secara instan
    const storedUser = localStorage.getItem('kai_user')
    const storedToken = localStorage.getItem('kai_token')
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.foto) {
          const convertedFoto = driveAvatarUrl(parsedUser.foto)
          if (convertedFoto && convertedFoto !== parsedUser.foto) {
            parsedUser.foto = convertedFoto
            try { localStorage.setItem('kai_user', JSON.stringify(parsedUser)) } catch (_) {}
          }
        }
        setUser(parsedUser)
        setToken(storedToken)

        // Background sync: ambil profil terbaru — tidak blocking, timeout 15 detik
        const syncController = new AbortController()
        const syncTimer = setTimeout(() => syncController.abort(), 15_000)

        api.getProfile(parsedUser.id, storedToken)
          .then(res => {
            clearTimeout(syncTimer)
            const currentToken = localStorage.getItem('kai_token')
            if (currentToken !== storedToken) return

            if (res.success && res.data) {
              const freshFoto = res.data.foto ? (driveAvatarUrl(res.data.foto) || res.data.foto) : parsedUser.foto
              const updatedUser = { ...parsedUser, ...res.data, foto: freshFoto }
              setUser(updatedUser)
              localStorage.setItem('kai_user', JSON.stringify(updatedUser))
            } else if (res.message && res.message.includes('Sesi')) {
              if (localStorage.getItem('kai_token') === storedToken) {
                logoutContext()
              }
            }
          })
          .catch(() => { clearTimeout(syncTimer) })
      } catch (e) {
        console.error('Failed to parse stored user:', e)
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

  // Update sebagian field user tanpa logout — digunakan setelah selfAssignLokasi
  const updateUserContext = (partialData) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...partialData }
      try { localStorage.setItem('kai_user', JSON.stringify(updated)) } catch (_) {}
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, loginContext, logoutContext, updateUserContext, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
