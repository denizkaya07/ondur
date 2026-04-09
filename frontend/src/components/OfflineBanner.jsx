import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [synced, setSynced]   = useState(false)

  useEffect(() => {
    const goOffline = () => { setOffline(true);  setSynced(false) }
    const goOnline  = () => { setOffline(false) }
    const onSynced  = () => { setSynced(true); setTimeout(() => setSynced(false), 3000) }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    window.addEventListener('ondur:synced', onSynced)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('ondur:synced', onSynced)
    }
  }, [])

  if (!offline && !synced) return null

  return (
    <div style={{
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      padding: '8px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500',
      zIndex: 9000, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      background: offline ? '#e53e3e' : '#1a7a4a',
      color: '#fff',
    }}>
      {offline ? '📵 Çevrimdışı — veriler yerel' : '✅ Senkronize edildi'}
    </div>
  )
}
