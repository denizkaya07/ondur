import api from './api'
import { dbGetQueue, dbDequeue } from './db'

async function flush() {
  const queue = await dbGetQueue()
  if (!queue.length) return

  let synced = 0
  for (const entry of queue) {
    try {
      await api({ method: entry.method, url: entry.url, data: entry.body })
      await dbDequeue(entry._qid)
      synced++
    } catch {
      // kalıcı hata (400 vb.) → kuyruğu temizle, kullanıcıya bildirmiyoruz
      await dbDequeue(entry._qid)
    }
  }
  if (synced > 0) {
    window.dispatchEvent(new CustomEvent('ondur:synced', { detail: { count: synced } }))
  }
}

export const syncManager = {
  init() {
    window.addEventListener('online', () => {
      flush()
    })
    // Uygulama açılışında da dene
    if (navigator.onLine) flush()
  },
}
