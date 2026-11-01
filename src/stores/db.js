// IndexedDB 存储封装，用于桌面小组件数据持久化
const DB_NAME = 'jyos'
const DB_VERSION = 1
const STORE_NAME = 'desktop'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
  return dbPromise
}

export async function loadWidgets() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get('widgets')
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : [])
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[db] 加载失败，使用空列表', err)
    return []
  }
}

// 通用键值读取（如主题设置），不存在时返回 null
export async function loadValue(key) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn(`[db] 读取 ${key} 失败`, err)
    return null
  }
}

export async function saveValue(key, value) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(value, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn(`[db] 保存 ${key} 失败`, err)
  }
}

export async function exportAllData() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve(keysRequest.result.map((key, index) => [key, valuesRequest.result[index]]))
  })
}

export async function replaceAllData(entries) {
  if (!Array.isArray(entries) || entries.some((entry) => !Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string')) {
    throw new Error('备份文件格式无效。')
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    for (const [key, value] of entries) store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('导入失败，数据未更改。'))
  })
}

export async function saveWidgets(widgets) {
  try {
    // Vue reactive collections contain proxies, which IndexedDB cannot structured-clone.
    // Widget persistence only needs JSON-compatible values (position and custom data).
    const serializableWidgets = JSON.parse(JSON.stringify(widgets))
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(serializableWidgets, 'widgets')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('Widget save transaction aborted'))
    })
  } catch (err) {
    console.warn('[db] 保存小组件失败', err)
  }
}
