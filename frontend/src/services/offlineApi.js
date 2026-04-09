/**
 * Offline-First API sarmalayıcı.
 * Çevrimiçi: normal istek → IDB'ye yaz.
 * Çevrimdışı GET: IDB'den oku.
 * Çevrimdışı POST/PATCH: kuyruğa ekle, UI'ya başarı döndür.
 */
import api from './api'
import { dbGetAll, dbPutAll, dbEnqueue } from './db'

async function getWithCache(url, store) {
  if (navigator.onLine) {
    try {
      const res = await api.get(url)
      const data = res.data
      if (Array.isArray(data)) await dbPutAll(store, data)
      return { data, offline: false }
    } catch {
      // online ama hata — cache'e düş
    }
  }
  const cached = await dbGetAll(store)
  return { data: cached, offline: true }
}

export const offlineApi = {
  // ── GET ──
  getDanisanlar: () => getWithCache('/ciftci/danisanlarim/', 'danisanlar'),
  getReceteler:  () => getWithCache('/recete/benim/', 'receteler'),
  getIsletmeler: () => getWithCache('/ciftci/isletmelerim/', 'isletmeler'),

  // ── POST (reçete) ──
  async postRecete(payload) {
    if (navigator.onLine) {
      const res = await api.post('/recete/', payload)
      return { data: res.data, offline: false }
    }
    await dbEnqueue({ method: 'POST', url: '/recete/', body: payload, ts: Date.now() })
    return { data: { ...payload, id: `offline-${Date.now()}` }, offline: true }
  },

  // ── POST (toprak analiz) ──
  async postToprak(isletmeId, payload) {
    const url = `/ciftci/isletme/${isletmeId}/toprak-analiz/`
    if (navigator.onLine) {
      const res = await api.post(url, payload)
      return { data: res.data, offline: false }
    }
    await dbEnqueue({ method: 'POST', url, body: payload, ts: Date.now() })
    return { data: { ...payload, id: `offline-${Date.now()}` }, offline: true }
  },

  // ── PATCH (GPS) ──
  async patchIsletme(id, payload) {
    const url = `/ciftci/isletme/${id}/guncelle/`
    if (navigator.onLine) {
      const res = await api.patch(url, payload)
      return { data: res.data, offline: false }
    }
    await dbEnqueue({ method: 'PATCH', url, body: payload, ts: Date.now() })
    return { data: payload, offline: true }
  },
}
