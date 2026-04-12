import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/token/yenile/`, { refresh })
          localStorage.setItem('access', res.data.access)
          if (res.data.refresh) localStorage.setItem('refresh', res.data.refresh)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.location.href = '/giris'
        }
      } else {
        window.location.href = '/giris'
      }
    }
    return Promise.reject(error)
  }
)

export default api
