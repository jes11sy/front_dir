/**
 * Remember Me функционал с использованием IndexedDB и шифрования
 * Для устойчивости на iOS PWA режиме
 * 
 * 🔒 БЕЗОПАСНОСТЬ:
 * - Данные шифруются AES-256-GCM
 * - Ключ производится через PBKDF2 (100k итераций)
 * - Привязка к домену (нельзя использовать на другом сайте)
 * - Срок действия 90 дней
 */

const DB_NAME = 'dir_auth_db'
const DB_VERSION = 1
const STORE_NAME = 'credentials'
const CREDENTIALS_KEY = 'saved_credentials'
const EXPIRY_DAYS = 90 // Срок хранения учетных данных

interface SavedCredentials {
  encryptedData: string
  iv: string
  salt: string
  expiresAt: number
}

interface Credentials {
  login: string
  password: string
}

/**
 * Проверяет доступность необходимых API
 */
function isSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof indexedDB === 'undefined') return false
  if (typeof crypto === 'undefined' || !crypto.subtle) return false
  return true
}

/**
 * Открывает или создает IndexedDB с таймаутом
 */
async function openDB(): Promise<IDBDatabase> {
  if (!isSupported()) {
    throw new Error('IndexedDB or Crypto API not supported')
  }

  return new Promise((resolve, reject) => {
    // Таймаут 5 секунд на открытие БД
    const timeout = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'))
    }, 5000)

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        clearTimeout(timeout)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        clearTimeout(timeout)
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      
      // iOS Safari Private Mode может блокировать IndexedDB
      request.onblocked = () => {
        clearTimeout(timeout)
        reject(new Error('IndexedDB blocked'))
      }
    } catch (e) {
      clearTimeout(timeout)
      reject(e)
    }
  })
}

/**
 * Генерирует ключ шифрования из стабильного device fingerprint
 * Используем только те характеристики, которые НЕ меняются:
 * - НЕ userAgent (меняется при обновлении браузера)
 * - НЕ screen size (меняется при повороте)
 * Используем фиксированный ключ + домен для привязки к сайту
 */
async function generateEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  // Стабильный fingerprint - не меняется при обновлениях или поворотах
  const fingerprint = [
    'dir_auth_v1',                    // Версия схемы шифрования
    window.location.origin,           // Привязка к домену
    navigator.language || 'ru',       // Язык (редко меняется)
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // Таймзона
  ].join('|')

  // Импортируем fingerprint как базовый ключ
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Создаем производный ключ с использованием соли
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Шифрует учетные данные
 */
async function encryptCredentials(credentials: Credentials): Promise<SavedCredentials> {
  // Генерируем случайную соль и IV
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Получаем ключ шифрования
  const key = await generateEncryptionKey(salt)

  // Шифруем данные
  const encodedData = new TextEncoder().encode(JSON.stringify(credentials))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  // Конвертируем в base64 для хранения
  const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const saltBase64 = btoa(String.fromCharCode(...salt))

  return {
    encryptedData,
    iv: ivBase64,
    salt: saltBase64,
    expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
}

/**
 * Расшифровывает учетные данные
 */
async function decryptCredentials(saved: SavedCredentials): Promise<Credentials | null> {
  try {
    // Проверяем срок действия
    if (Date.now() > saved.expiresAt) {
      return null
    }

    // Декодируем из base64
    const encryptedData = Uint8Array.from(atob(saved.encryptedData), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(saved.iv), c => c.charCodeAt(0))
    const salt = Uint8Array.from(atob(saved.salt), c => c.charCodeAt(0))

    // Получаем ключ шифрования
    const key = await generateEncryptionKey(salt)

    // Расшифровываем
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    const decryptedData = new TextDecoder().decode(decryptedBuffer)
    return JSON.parse(decryptedData)
  } catch {
    // Ошибка расшифровки - данные повреждены или ключ изменился
    return null
  }
}

/**
 * Сохраняет учетные данные в IndexedDB
 */
export async function saveCredentials(login: string, password: string): Promise<void> {
  try {
    const encrypted = await encryptCredentials({ login, password })
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(encrypted, CREDENTIALS_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Не бросаем ошибку - пользователь просто не будет запомнен
  }
}

/**
 * Получает сохраненные учетные данные из IndexedDB
 */
export async function getSavedCredentials(): Promise<Credentials | null> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(CREDENTIALS_KEY)

      request.onsuccess = async () => {
        const saved = request.result as SavedCredentials | undefined
        if (!saved) {
          resolve(null)
          return
        }

        const credentials = await decryptCredentials(saved)
        resolve(credentials)
      }
      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

/**
 * Удаляет сохраненные учетные данные
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(CREDENTIALS_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Не бросаем ошибку - просто игнорируем
  }
}

/**
 * Проверяет, есть ли сохраненные учетные данные
 */
export async function hasSavedCredentials(): Promise<boolean> {
  const credentials = await getSavedCredentials()
  return credentials !== null
}
