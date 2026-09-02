import React, { createContext, useContext, useState, useEffect } from 'react'

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
      // Fix: konversi URL foto Drive lama ke format thumbnail yang bisa dirender
      if (parsedUser.foto) {
        const match = parsedUser.foto.match(/[?&]id=([^&]+)/) || parsedUser.foto.match(/\/file\/d\/([^/]+)/) || parsedUser.foto.match(/\/uc\?id=([^&]+)/) || parsedUser.foto.match(/\/d\/([^/]+)\//)
        if (match && !parsedUser.foto.includes('thumbnail')) {
          parsedUser.foto = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
        }
      }
      setUser(parsedUser)
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const loginContext = (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('kai_user', JSON.stringify(userData))
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
