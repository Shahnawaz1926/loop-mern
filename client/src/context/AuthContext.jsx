import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const storedToken = localStorage.getItem('loop_token')
  const storedUser = localStorage.getItem('loop_user')

  if (storedToken && storedUser) {
    setToken(storedToken)
    setUser(JSON.parse(storedUser))
  }
  setLoading(false)
}, [])

  function login(newToken, newUser) {
    localStorage.setItem('loop_token', newToken)
    localStorage.setItem('loop_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem('loop_token')
    localStorage.removeItem('loop_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}