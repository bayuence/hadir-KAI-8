import React, { createContext, useContext, useState, useEffect } from 'react'
import { driveAvatarUrl } from '../utils/driveImage'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load auth from storage on mount
    const storedUser = localStorage.getItem('kai_user')
    const storedToken = localStorage.getItem('kai_token')
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser)
      // Fix: konversi URL foto Drive ke format lh3 (Safari-compatible, tidak butuh cookie)
      if (parsedUser.foto) {
        parsedUser.foto = driveAvatarUrl(parsedUser.foto) || parsedUser.foto
      }
      setUser(parsedUser)
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const loginContext = (userData, userToken) => {
    // Konversi foto ke format lh3 Safari-safe saat login
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
  }

  return (
    <AuthContext.Provider value={{ user, token, loginContext, logoutContext, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
