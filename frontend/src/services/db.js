import { openDB } from 'idb'

const DB_NAME = 'ondur-db'
const DB_VER  = 1

let _db = null

async function db() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('danisanlar'))
        db.createObjectStore('danisanlar', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('receteler'))
        db.createObjectStore('receteler', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('isletmeler'))
        db.createObjectStore('isletmeler', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('sync-queue'))
        db.createObjectStore('sync-queue', { autoIncrement: true, keyPath: '_qid' })
    },
  })
  return _db
}

export async function dbGetAll(store) {
  return (await db()).getAll(store)
}

export async function dbPutAll(store, items) {
  const d = await db()
  const tx = d.transaction(store, 'readwrite')
  await Promise.all(items.map(item => tx.store.put(item)))
  await tx.done
}

export async function dbEnqueue(entry) {
  return (await db()).add('sync-queue', entry)
}

export async function dbGetQueue() {
  return (await db()).getAll('sync-queue')
}

export async function dbDequeue(qid) {
  return (await db()).delete('sync-queue', qid)
}
