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
      setUser(JSON.parse(storedUser))
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
