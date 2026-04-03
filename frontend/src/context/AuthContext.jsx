/* eslint react-refresh/only-export-components: 0 */
import { createContext, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import api from '../services/api'

const AuthContext = createContext()

export { AuthContext }

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access')
    if (token) {
      api.get('/auth/profil/')
        .then(res => setKullanici(res.data))
        .catch(() => localStorage.clear())
        .finally(() => setYukleniyor(false))
    } else {
      setYukleniyor(false)
    }
  }, [])

const girisYap = async (telefon, sifre) => {
    const res = await api.post('/auth/giris/', { telefon, password: sifre })
    localStorage.setItem('access', res.data.access)
    localStorage.setItem('refresh', res.data.refresh)
    const profil = await api.get('/auth/profil/')
    setKullanici(profil.data)
    return profil.data
  }

  const cikisYap = () => {
    localStorage.clear()
    setKullanici(null)
    window.location.href = '/giris'
  }

  return (
    <AuthContext.Provider value={{ kullanici, setKullanici, yukleniyor, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAuth = () => useContext(AuthContext)