import type { Collection, Item } from '../types'

const DB_NAME = 'monolog-db'
const DB_VERSION = 1
const COLLECTIONS = 'collections'
const ITEMS = 'items'

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(COLLECTIONS)) {
        db.createObjectStore(COLLECTIONS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(ITEMS)) {
        const store = db.createObjectStore(ITEMS, { keyPath: 'id' })
        store.createIndex('collectionId', 'collectionId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async <T>(storeName: string, mode: IDBTransactionMode, task: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb()
  try {
    const tx = db.transaction(storeName, mode)
    const result = await requestToPromise(task(tx.objectStore(storeName)))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    return result
  } finally {
    db.close()
  }
}

export const db = {
  getCollections: () => withStore<Collection[]>(COLLECTIONS, 'readonly', (store) => store.getAll()),
  putCollection: (collection: Collection) => withStore<IDBValidKey>(COLLECTIONS, 'readwrite', (store) => store.put(collection)),
  deleteCollection: async (id: string) => {
    const database = await openDb()
    try {
      const tx = database.transaction([COLLECTIONS, ITEMS], 'readwrite')
      tx.objectStore(COLLECTIONS).delete(id)
      const itemStore = tx.objectStore(ITEMS)
      const index = itemStore.index('collectionId')
      const range = IDBKeyRange.only(id)
      const cursorReq = index.openCursor(range)
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      database.close()
    }
  },
  getItems: () => withStore<Item[]>(ITEMS, 'readonly', (store) => store.getAll()),
  putItem: (item: Item) => withStore<IDBValidKey>(ITEMS, 'readwrite', (store) => store.put(item)),
  deleteItem: (id: string) => withStore<undefined>(ITEMS, 'readwrite', (store) => store.delete(id)),
  replaceAll: async (collections: Collection[], items: Item[]) => {
    const database = await openDb()
    try {
      const tx = database.transaction([COLLECTIONS, ITEMS], 'readwrite')
      const collectionsStore = tx.objectStore(COLLECTIONS)
      const itemsStore = tx.objectStore(ITEMS)
      collectionsStore.clear()
      itemsStore.clear()
      collections.forEach((collection) => collectionsStore.put(collection))
      items.forEach((item) => itemsStore.put(item))
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      database.close()
    }
  },
}
