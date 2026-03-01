import { fetchWithRetry as fetchWithRetryUtil, getUserFriendlyErrorMessage, classifyNetworkError, type NetworkError } from './fetch-with-retry'
import { logger } from './logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

/**
 * Безопасный парсинг JSON ответа
 * Обрабатывает случаи когда сервер возвращает не-JSON (например 502/504 ошибки)
 */
async function safeParseJson<T = any>(response: Response, defaultValue?: T): Promise<T> {
  const text = await response.text()
  
  if (!text || text.trim() === '') {
    if (defaultValue !== undefined) return defaultValue
    throw new Error('Пустой ответ от сервера')
  }
  
  try {
    return JSON.parse(text)
  } catch {
    // Если не JSON - логируем и выбрасываем понятную ошибку
    logger.error('Failed to parse JSON response', { 
      status: response.status, 
      url: response.url,
      textPreview: text.substring(0, 200) 
    })
    throw new Error(`Ошибка сервера (${response.status}): некорректный ответ`)
  }
}

/**
 * Извлекает сообщение об ошибке из ответа сервера
 */
async function extractErrorMessage(response: Response, defaultMessage: string): Promise<string> {
  try {
    const data = await safeParseJson(response)
    return data.message || defaultMessage
  } catch {
    return `${defaultMessage}: ${response.status} ${response.statusText}`
  }
}

export interface User {
  id: string
  login: string
  name: string
  role: string
  cities: string[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface Order {
  id: number
  rkId: number
  rk?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  equipmentTypeId: number
  equipmentType?: { id: number; name: string }
  statusId: number
  status?: { id: number; name: string; code: string }
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  callRecord?: string
  masterId?: number
  result?: number
  expenditure?: number
  clean?: number
  masterChange?: number
  bsoDoc?: string[] | null
  expenditureDoc?: string[] | null
  operatorId: number
  createdAt: string
  closingAt?: string
  avitoChatId?: string
  callId?: string
  prepayment?: number
  dateClosmod?: string
  comment?: string
  cashSubmissionStatus?: string
  cashSubmissionDate?: string
  cashSubmissionAmount?: number
  cashReceiptDoc?: string
  cashApprovedBy?: number
  cashApprovedDate?: string
  partner?: boolean
  partnerPercent?: number
  operator?: {
    id: number
    name: string
    login: string
  }
  master?: {
    id: number
    name: string
  }
  avito?: {
    id: number
    name: string
  }
}

export interface OrdersResponse {
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface OrdersStats {
  totalOrders: number
  completedOrders: number
  inProgressOrders: number
  pendingOrders: number
  totalRevenue: number
}

export interface Master {
  id: number
  name: string
  cityIds: number[]
  cities?: { id: number; name: string }[]
  status: string
}

export interface Call {
  id: number
  rkId?: number
  rk?: { id: number; name: string }
  cityId?: number
  city?: { id: number; name: string }
  phoneClient: string
  phoneAts: string
  createdAt: string
  operatorId: number
  status: string
  mangoCallId?: number
  recordingPath?: string
  recordingProcessedAt?: string
  operator?: {
    id: number
    name: string
    login: string
  }
}

export interface Employee {
  id: number
  name: string
  login?: string
  password?: string
  hasPassword?: boolean
  cityIds: number[]
  cities?: { id: number; name: string }[]
  status: 'active' | 'inactive'
  createdAt: string
  note?: string
  tgId?: string
  chatId?: string
  passport?: string
  contract?: string
  updatedAt: string
}

export interface CreateEmployeeDto {
  name: string
  login?: string
  password?: string
  cityIds?: number[]
  status?: 'active' | 'inactive'
  note?: string
  tgId?: string
  chatId?: string
  passport?: string
  contract?: string
}

export interface CashTransaction {
  id: number
  name: string
  amount: number
  cityId?: number
  city?: { id: number; name: string }
  note?: string
  receiptDoc?: string
  receiptDocs?: string[]
  paymentPurpose?: string
  createdAt: string
  nameCreate: string
  updatedAt: string
}

/**
 * 🔧 FIX: Статистика кассы - считается на сервере через SQL
 * Решает проблему с limit=10000 и 502 ошибками
 */
export interface CashStats {
  totalIncome: number
  totalExpense: number
  balance: number
  incomeCount: number
  expenseCount: number
}

export interface CashTransactionsResponse {
  data: CashTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CityReport {
  city: string
  orders: {
    closedOrders: number  // Количество заказов со статусом "Готово" или "Отказ" (всего закрытых)
    refusals: number      // Отказы (не используется, всегда 0)
    notOrders: number     // Не заказ - заказы со статусом "Незаказ"
    totalClean: number    // Сумма чистыми по закрытым заказам
    totalMasterChange: number  // Сумма сдача мастера
    avgCheck: number      // Средний чек = totalClean / closedOrders
  }
  stats?: {
    turnover: number           // Оборот = сумма чистыми
    profit: number             // Прибыль = сумма сдача мастера
    totalOrders: number        // Заказов (всего: Готово + Отказ + Незаказ)
    notOrders: number          // Не заказ (статус "Незаказ")
    zeroOrders: number         // Ноль = количество отказов (статус "Отказ")
    completedOrders: number    // Выполненных в деньги = Готово где result > 0
    completedPercent: number   // Вып в деньги (%) = completedOrders / totalClosed * 100
    microCheckCount: number    // Микрочек (до 10к) - Готово с clean<10000
    over10kCount: number       // От 10к - Готово с clean>=10000
    efficiency: number         // Эффективность
    avgCheck: number           // Ср чек
    maxCheck: number           // Макс чек (по clean)
    masterHandover: number     // СД = кол-во Модерн
  }
  cash: {
    totalAmount: number   // Касса (все приходы-расходы за все время)
  }
}

export interface MasterReport {
  masterId: number
  masterName: string
  city: string
  totalOrders: number
  turnover: number        // Оборот (сумма чистыми)
  avgCheck: number        // Средний чек
  salary: number          // Зарплата (сумма сдача мастера)
}

export class ApiClient {
  private baseURL: string
  private isRefreshing: boolean = false
  private refreshSubscribers: (() => void)[] = []
  private isLoggingOut: boolean = false // 🔒 Защита от множественных logout
  private silentRefreshInterval: ReturnType<typeof setInterval> | null = null
  private lastActivityTime: number = Date.now()
  
  // ✅ FIX: Mutex для предотвращения race condition при параллельных refresh запросах
  private refreshPromise: Promise<boolean> | null = null

  // Колбэк для редиректа (устанавливается из компонента с доступом к router)
  private onAuthError: (() => void) | null = null

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    // 🍪 Токены теперь хранятся в httpOnly cookies на сервере
    
    // Запускаем Silent Refresh при создании клиента
    if (typeof window !== 'undefined') {
      this.startSilentRefresh()
      this.trackActivity()
    }
  }

  /**
   * Установить колбэк для обработки ошибок авторизации
   * Вызывается из AuthGuard для использования Next.js router
   */
  setAuthErrorCallback(callback: () => void) {
    this.onAuthError = callback
  }

  /**
   * 🔄 Silent Refresh - фоновое обновление токена
   * Проверяет каждые 4 минуты и обновляет токен если пользователь активен
   */
  private startSilentRefresh() {
    // Очищаем предыдущий интервал если был
    if (this.silentRefreshInterval) {
      clearInterval(this.silentRefreshInterval)
    }

    // Проверяем каждые 4 минуты (токен живёт 15 минут, обновляем заранее)
    this.silentRefreshInterval = setInterval(async () => {
      // Обновляем только если пользователь был активен в последние 10 минут
      const inactiveTime = Date.now() - this.lastActivityTime
      const isActive = inactiveTime < 10 * 60 * 1000 // 10 минут

      if (isActive) {
        try {
          await this.refreshAccessToken()
          logger.debug('Silent refresh successful')
        } catch (error) {
          logger.debug('Silent refresh failed, user may need to re-login')
        }
      }
    }, 4 * 60 * 1000) // Каждые 4 минуты
  }

  /**
   * Остановить Silent Refresh (при logout)
   */
  private stopSilentRefresh() {
    if (this.silentRefreshInterval) {
      clearInterval(this.silentRefreshInterval)
      this.silentRefreshInterval = null
    }
  }

  /**
   * Отслеживание активности пользователя
   */
  private trackActivity() {
    const updateActivity = () => {
      this.lastActivityTime = Date.now()
    }

    // Отслеживаем клики, нажатия клавиш и скролл
    document.addEventListener('click', updateActivity, { passive: true })
    document.addEventListener('keypress', updateActivity, { passive: true })
    document.addEventListener('scroll', updateActivity, { passive: true })
    document.addEventListener('touchstart', updateActivity, { passive: true })
  }

  private onRefreshed() {
    this.refreshSubscribers.forEach(callback => callback())
    this.refreshSubscribers = []
  }

  private addRefreshSubscriber(callback: () => void) {
    this.refreshSubscribers.push(callback)
  }

  /**
   * 🍪 Очистить данные пользователя из localStorage
   * Токены хранятся в httpOnly cookies и очищаются на сервере
   */
  clearToken() {
    if (typeof window === 'undefined') return
    
    // Очищаем только данные пользователя
    sessionStorage.removeItem('user')
    localStorage.removeItem('user')
  }

  /**
   * Fetch с retry логикой (только для GET запросов)
   * БЕЗОПАСНО: Не повторяет POST/PUT/DELETE чтобы избежать дублирования действий
   * 
   * 🔧 УЛУЧШЕНО: Увеличены retries и timeout для обработки 502 cold start ошибок
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithRetryUtil(url, {
      ...options,
      retryOptions: {
        maxRetries: 3,        // 3 повторные попытки (итого 4 запроса) для надежности при 502
        retryDelay: 1500,     // 1.5 секунды между попытками (даем бэкенду время прогреться)
        backoff: true,        // Экспоненциальная задержка (1.5s, 3s, 6s...)
        timeout: 15000,       // 15 секунд таймаут (больше для cold start)
        retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'], // Включая 502/503/504
      },
    })
  }

  /**
   * 🍪 Обновление токенов через httpOnly cookies
   * Сервер автоматически обновит cookies
   * ✅ FIX: Mutex для предотвращения race condition при параллельных refresh запросах
   * Если несколько запросов одновременно получают 401, только один делает refresh,
   * остальные ждут его результат — это предотвращает token reuse detection на backend
   */
  private async refreshAccessToken(): Promise<boolean> {
    // Если refresh уже выполняется - ждём его результат
    if (this.refreshPromise) {
      logger.debug('[Auth] Refresh already in progress, waiting...')
      return this.refreshPromise
    }
    
    // Запускаем refresh и сохраняем Promise для других запросов
    this.refreshPromise = this.doRefreshToken()
    
    try {
      return await this.refreshPromise
    } finally {
      // Сбрасываем Promise после завершения (успех или ошибка)
      this.refreshPromise = null
    }
  }

  /**
   * Реальная логика обновления токена (вызывается только один раз при параллельных запросах)
   * 🔧 УЛУЧШЕНО: Добавлен retry с экспоненциальной задержкой
   */
  private async doRefreshToken(): Promise<boolean> {
    const maxAttempts = 3
    
    logger.debug('[Auth] Starting token refresh')
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Use-Cookies': 'true',
          },
          credentials: 'include',
          body: JSON.stringify({}),
        })

        if (response.ok) {
          logger.debug('[Auth] Token refresh successful')
          return true
        }
        
        // Если 401/403 - токен невалиден, не повторяем
        if (response.status === 401 || response.status === 403) {
          logger.warn('[Auth] Refresh token invalid or expired', { status: response.status })
          return false
        }
        
        // Для других ошибок (500, 502, 503) - повторяем
        if (attempt < maxAttempts) {
          const delay = 1000 * Math.pow(2, attempt - 1) // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        logger.error('[Auth] Token refresh error', { error: String(error), attempt })
        // Сетевая ошибка - повторяем
        if (attempt < maxAttempts) {
          const delay = 1000 * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    return false
  }

  /**
   * 🍪 Безопасная обработка запросов с httpOnly cookies
   * Автоматически добавляет credentials и X-Use-Cookies header
   */
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      // Добавляем credentials и X-Use-Cookies для всех запросов
      const enhancedOptions: RequestInit = {
        ...options,
        credentials: 'include',
        cache: 'no-store', // Отключаем кэширование на уровне fetch
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
          ...options?.headers,
        },
      }

      // Используем fetchWithRetry для GET запросов (безопасно повторять)
      const shouldRetry = !options?.method || options.method === 'GET'
      
      const response = shouldRetry 
        ? await this.fetchWithRetry(url, enhancedOptions)
        : await fetch(url, enhancedOptions)
      
      // 🔧 FIX: Если мы на странице /login, НЕ пытаемся refresh/logout (избегаем бесконечного цикла)
      const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'
      
      // Если 401/403 ошибка и это не логин/рефреш - пытаемся обновить токен
      // 403 может быть из-за истекшего токена, который прошел JWT validation но не прошел роли
      if ((response.status === 401 || response.status === 403) && !url.includes('/auth/login') && !url.includes('/auth/refresh') && !isOnLoginPage) {
        if (this.isRefreshing) {
          // Если токен уже обновляется, ждем завершения
          return new Promise((resolve, reject) => {
            this.addRefreshSubscriber(() => {
              // Повторяем запрос с обновленными cookies (используем fetchWithRetry для надежности)
              this.fetchWithRetry(url, enhancedOptions).then(resolve).catch(reject)
            })
          })
        }

        this.isRefreshing = true

        try {
          const refreshSuccess = await this.refreshAccessToken()
          
          if (refreshSuccess) {
            this.onRefreshed()

            // Повторяем оригинальный запрос с обновленными cookies (используем fetchWithRetry)
            const retryResponse = await this.fetchWithRetry(url, enhancedOptions)
            this.isRefreshing = false
            return retryResponse
          } else {
            // Не удалось обновить токен - вызываем безопасный logout
            this.isRefreshing = false
            await this.handleAuthError()
            throw new Error('SESSION_EXPIRED')
          }
        } catch (error) {
          this.isRefreshing = false
          // Если ошибка при обновлении токена
          if (error instanceof Error && error.message !== 'SESSION_EXPIRED') {
            // Проверяем, сетевая ли это ошибка
            const networkError = classifyNetworkError(error)
            if (networkError.type === 'NETWORK_ERROR' || networkError.type === 'TIMEOUT') {
              // Сетевая ошибка - НЕ делаем logout, просто выбрасываем ошибку
              logger.debug('Network error during refresh, not logging out')
              throw new Error('Проблемы с сетью. Проверьте подключение к интернету.')
            }
            // Ошибка авторизации - делаем logout
            await this.handleAuthError()
          }
          throw error
        }
      }

      return response
    } catch (error: any) {
      // Если это ошибка истечения сессии, не показываем её пользователю
      if (error.message === 'SESSION_EXPIRED') {
        throw error
      }
      
      // Классифицируем ошибку и даем понятное сообщение
      const networkError = classifyNetworkError(error)
      const userMessage = getUserFriendlyErrorMessage(networkError)
      
      // 🔒 НЕ делаем logout при сетевых ошибках
      if (networkError.type === 'NETWORK_ERROR' || networkError.type === 'TIMEOUT') {
        logger.debug('Network error, not logging out:', networkError.type)
      }
      
      // Логируем детали только в development
      if (process.env.NODE_ENV === 'development') {
        console.error('Network Error:', {
          type: networkError.type,
          url,
          message: networkError.message,
          retryable: networkError.retryable,
        })
      }
      
      // Выбрасываем ошибку с понятным сообщением
      throw new Error(userMessage)
    }
  }

  /**
   * 🔒 Безопасная обработка ошибки авторизации
   * Защищает от множественных вызовов logout и бесконечного цикла на /login
   */
  private async handleAuthError(): Promise<void> {
    // Защита от множественных вызовов
    if (this.isLoggingOut) {
      logger.debug('Already logging out, skipping')
      return
    }
    
    // 🔧 FIX: Не делаем редирект если уже на странице /login (предотвращает бесконечный цикл)
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      logger.debug('Already on login page, skipping redirect')
      return
    }
    
    this.isLoggingOut = true
    
    try {
      await this.logout()
      
      // Используем колбэк если установлен (Next.js router)
      if (this.onAuthError) {
        this.onAuthError()
      } else if (typeof window !== 'undefined') {
        // Fallback на window.location только если колбэк не установлен
        window.location.href = '/login'
      }
    } finally {
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        this.isLoggingOut = false
      }, 1000)
    }
  }

  /**
   * 🍪 Авторизация с httpOnly cookies
   * Токены автоматически устанавливаются сервером в cookies
   * 
   * @param login - Логин директора
   * @param password - Пароль
   *   ⚠️ SECURITY: НЕ логировать, НЕ сохранять в storage
   *   Хэшируется на сервере через bcrypt (12 rounds)
   */
  async login(login: string, password: string): Promise<LoginResponse> {
    const response = await this.safeFetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password,
        role: 'director' // Director фронтенд всегда использует роль director
      }),
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      let errorMessage = 'Ошибка авторизации'
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json()
          errorMessage = error.message || errorMessage
        } catch {
          // Не JSON - используем дефолтное сообщение
        }
      }
      
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    // Сохраняем данные пользователя
    // ✅ FIX #150: Санитизация данных перед сохранением в localStorage
    if (result.success && result.data && result.data.user) {
      // Логируем наличие refreshToken (без самого токена)
      if (!result.data.refreshToken) {
        logger.warn('Login response missing refreshToken', { 
          hasSuccess: result.success,
          hasData: !!result.data,
          hasUser: !!result.data?.user,
          dataKeys: result.data ? Object.keys(result.data) : []
        })
      }
      if (typeof window !== 'undefined') {
        const { sanitizeObject } = await import('./sanitize')
        const sanitizedUser = sanitizeObject(result.data.user as Record<string, unknown>)
        // Всегда сохраняем в sessionStorage для текущей сессии
        sessionStorage.setItem('user', JSON.stringify(sanitizedUser))
        // И в localStorage для автологина при повторном открытии
        localStorage.setItem('user', JSON.stringify(sanitizedUser))
      }
      
      // Сохраняем refresh token в IndexedDB (backup для iOS PWA)
      if (result.data.refreshToken) {
        try {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(result.data.refreshToken)
        } catch (error) {
          logger.error('Failed to save refresh token to IndexedDB:', error)
          // Не прерываем процесс логина
        }
      }
      
      return {
        access_token: '', // Токены в cookies
        refresh_token: result.data.refreshToken || '',
        user: result.data.user
      }
    }
    
    return result
  }

  /**
   * 🍪 Получение профиля пользователя с httpOnly cookies
   * Используется для проверки валидности сессии
   */
  async getProfile(): Promise<User> {
    const response = await this.safeFetch(`${this.baseURL}/auth/profile`, {
      method: 'GET',
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      let errorMessage = 'Ошибка получения профиля'
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json()
          errorMessage = error.message || errorMessage
        } catch {
          // Не JSON
        }
      }
      
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.success && result.data ? result.data : result
  }

  /**
   * 🍪 Выход с очисткой httpOnly cookies на сервере
   * 🔒 УЛУЧШЕНО: Защита от множественных вызовов
   */
  async logout(): Promise<void> {
    // Останавливаем Silent Refresh
    this.stopSilentRefresh()
    
    // Очищаем сохраненный refresh token из IndexedDB
    try {
      const { clearRefreshToken } = await import('./remember-me')
      await clearRefreshToken()
    } catch (error) {
      logger.error('Failed to clear refresh token', error)
    }

    try {
      logger.debug('Sending logout request to server')
      // Используем обычный fetch чтобы избежать рекурсии через safeFetch
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      })
    } catch (error) {
      logger.error('Ошибка при выходе на сервере', error)
    } finally {
      this.clearToken()
      logger.debug('Local data cleared')
    }
  }

  /**
   * 🍪 Проверка аутентификации через API
   * Нельзя проверить httpOnly cookies на клиенте - нужен запрос к серверу
   * 
   * 🔧 FIX: Используем простой fetch БЕЗ safeFetch чтобы избежать бесконечного цикла
   * при 401 ошибке (safeFetch пытается refresh → logout → снова проверка → цикл)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Простой запрос БЕЗ retry и refresh логики
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 сек таймаут
      
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // 🔒 429 Too Many Requests - пробрасываем ошибку чтобы НЕ вызвать бесконечный цикл
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED')
      }
      
      return response.ok
    } catch (error) {
      // Rate limit - пробрасываем наверх
      if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
        throw error
      }
      // Любая другая ошибка (сеть, таймаут, 401) - просто не авторизован
      return false
    }
  }

  /**
   * 🔄 Восстановление сессии через refresh token из IndexedDB
   * Используется когда cookies удалены (iOS ITP, PWA)
   * @returns true если сессия восстановлена
   */
  async restoreSessionFromIndexedDB(): Promise<boolean> {
    try {
      const { getRefreshToken } = await import('./remember-me')
      const refreshToken = await getRefreshToken()
      
      if (!refreshToken) {
        logger.debug('No refresh token in IndexedDB')
        return false
      }
      
      logger.debug('Found refresh token in IndexedDB, attempting to restore session')
      
      // Отправляем refresh token на сервер для получения новых cookies
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }), // Передаём токен в body
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Обновляем токен в IndexedDB если пришёл новый
        if (result.data?.refreshToken) {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(result.data.refreshToken)
        }
        
        logger.debug('Session restored from IndexedDB token')
        return true
      }
      
      // Токен невалиден — очищаем IndexedDB
      if (response.status === 401 || response.status === 403) {
        logger.debug('Refresh token from IndexedDB is invalid, clearing')
        const { clearRefreshToken } = await import('./remember-me')
        await clearRefreshToken()
      }
      
      return false
    } catch (error) {
      logger.error('Failed to restore session from IndexedDB', error)
      return false
    }
  }

  /**
   * Получить текущего пользователя из хранилища
   * БЕЗОПАСНОСТЬ: Приоритет sessionStorage над localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    // Сначала проверяем sessionStorage (безопаснее - очищается при закрытии)
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  // Orders API
  async getOrders(params: {
    page?: number
    limit?: number
    status?: string
    city?: string
    search?: string
    searchId?: string      // Поиск по ID заказа
    searchPhone?: string   // Поиск по телефону
    searchAddress?: string // Поиск по адресу
    master?: string  // ID мастера (для обратной совместимости)
    rkId?: string
    equipmentTypeId?: string
    dateType?: 'create' | 'close' | 'meeting'
    dateFrom?: string
    dateTo?: string
  } = {}): Promise<OrdersResponse> {
    // Защита от ошибки "The string did not match the expected pattern" в URLSearchParams (Safari iOS строже)
    // Используем ручное построение query string вместо URLSearchParams для совместимости
    const queryParts: string[] = []
    
    try {
      if (params.page) queryParts.push(`page=${encodeURIComponent(params.page.toString())}`)
      if (params.limit) queryParts.push(`limit=${encodeURIComponent(params.limit.toString())}`)
      if (params.status && params.status.trim()) queryParts.push(`status=${encodeURIComponent(params.status.trim())}`)
      if (params.city && params.city.trim()) queryParts.push(`city=${encodeURIComponent(params.city.trim())}`)
      if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`)
      if (params.searchId && params.searchId.trim()) queryParts.push(`searchId=${encodeURIComponent(params.searchId.trim())}`)
      if (params.searchPhone && params.searchPhone.trim()) queryParts.push(`searchPhone=${encodeURIComponent(params.searchPhone.trim())}`)
      if (params.searchAddress && params.searchAddress.trim()) queryParts.push(`searchAddress=${encodeURIComponent(params.searchAddress.trim())}`)
      if (params.master && params.master.trim()) queryParts.push(`masterId=${encodeURIComponent(params.master.trim())}`)
      if (params.rkId && params.rkId.trim()) queryParts.push(`rkId=${encodeURIComponent(params.rkId.trim())}`)
      if (params.equipmentTypeId && params.equipmentTypeId.trim()) queryParts.push(`equipmentTypeId=${encodeURIComponent(params.equipmentTypeId.trim())}`)
      if (params.dateType) queryParts.push(`dateType=${encodeURIComponent(params.dateType)}`)
      if (params.dateFrom && params.dateFrom.trim()) queryParts.push(`dateFrom=${encodeURIComponent(params.dateFrom.trim())}`)
      if (params.dateTo && params.dateTo.trim()) queryParts.push(`dateTo=${encodeURIComponent(params.dateTo.trim())}`)
    } catch (error) {
      // Если ошибка - просто не добавляем параметры
    }
    
    const url = queryParts.length > 0
      ? `${this.baseURL}/orders?${queryParts.join('&')}`
      : `${this.baseURL}/orders`
    
    const response = await this.safeFetch(url, {
      method: 'GET',
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка получения заказов')
      } catch {
        throw new Error(`Ошибка получения заказов: ${response.status}`)
      }
    }

    // Безопасный парсинг JSON - защита от ошибки "The string did not match the expected pattern"
    try {
      return await response.json()
    } catch (parseError) {
      console.error('Failed to parse orders response:', parseError)
      // Возвращаем пустой результат вместо падения (структура совместима с ожидаемой)
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } as OrdersResponse
    }
  }

  async getOrder(id: number): Promise<Order> {
    const response = await this.safeFetch(`${this.baseURL}/orders/${id}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения заказа')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    const response = await this.safeFetch(`${this.baseURL}/orders/${id}`, {
      method: 'PUT',
      // 🍪 Headers добавляются автоматически в safeFetch
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        console.error('Order update error:', error)
        throw new Error(error.message || `Ошибка обновления заказа: ${response.status}`)
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        throw new Error(`Ошибка обновления заказа: ${response.status} ${response.statusText}`)
      }
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
    return result.data || result
  }

  async getOrdersStats(): Promise<OrdersStats> {
    const response = await this.safeFetch(`${this.baseURL}/orders/stats/summary`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения статистики')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async getOrderStatuses(): Promise<string[]> {
    const response = await this.safeFetch(`${this.baseURL}/orders/statuses`, {
      method: 'GET',
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      throw new Error('Ошибка получения статусов')
    }

    try {
      const result = await response.json()
      return result.data || result
    } catch {
      return ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ']
    }
  }

  async getFilterOptions(): Promise<{ rks: { id: number; name: string }[], equipmentTypes: { id: number; name: string }[], cities: { id: number; name: string }[] }> {
    const response = await this.safeFetch(`${this.baseURL}/orders/filter-options`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Ошибка получения опций фильтров')
    }

    try {
      const result = await response.json()
      return result.data || { rks: [], equipmentTypes: [], cities: [] }
    } catch {
      return { rks: [], equipmentTypes: [], cities: [] }
    }
  }

  // Masters API (Users Service)
  async getMasters(): Promise<Master[]> {
    const response = await this.safeFetch(`${this.baseURL}/masters`, {
      method: 'GET',
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      throw new Error('Ошибка получения мастеров')
    }

    try {
      const result = await response.json()
      return result.data || result
    } catch {
      return []
    }
  }

  // Master Schedule API
  async getMasterSchedule(masterId: number, startDate: string, endDate: string): Promise<{ date: string; isWorkDay: boolean }[]> {
    const params = new URLSearchParams({ startDate, endDate })
    const response = await this.safeFetch(`${this.baseURL}/masters/${masterId}/schedule?${params}`, {
      method: 'GET',
    })

    if (!response.ok) {
      return []
    }

    try {
      const result = await response.json()
      return result.data?.schedule || []
    } catch {
      return []
    }
  }

  async updateMasterSchedule(masterId: number, days: { date: string; isWorkDay: boolean }[]): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/masters/${masterId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    })

    if (!response.ok) {
      throw new Error('Ошибка обновления графика')
    }
  }

  // Get all masters schedules in one request (optimized)
  async getAllMastersSchedules(startDate: string, endDate: string): Promise<{
    masters: Array<{
      id: number
      name: string
      status: string
      cityIds: number[]
      cities?: { id: number; name: string }[]
      schedule: { date: string; isWorkDay: boolean }[]
    }>
    period: { startDate: string; endDate: string }
  } | null> {
    const params = new URLSearchParams({ startDate, endDate })
    const response = await this.safeFetch(`${this.baseURL}/masters/schedules?${params}`, {
      method: 'GET',
    })

    if (!response.ok) {
      return null
    }

    try {
      const result = await response.json()
      return result.data || null
    } catch {
      return null
    }
  }

  // Employees API
  async getEmployees(): Promise<Employee[]> {
    const response = await this.safeFetch(`${this.baseURL}/employees`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения сотрудников')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    const data = result.data || result
    return Array.isArray(data) ? data : []
  }

  async getEmployee(id: number): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees/${id}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения сотрудника')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка создания сотрудника')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async updateEmployee(id: number, data: CreateEmployeeDto): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка обновления сотрудника')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  // Cash API (Cash Service)
  
  /**
   * 🔧 FIX: Получить статистику кассы (агрегация на сервере)
   * Решает проблему с limit=10000 и 502 ошибками
   * Суммы считаются через SQL - быстро и точно
   */
  async getCashStats(filters?: {
    city?: string
    type?: 'приход' | 'расход'
    startDate?: string
    endDate?: string
  }): Promise<CashStats> {
    const params = new URLSearchParams()
    if (filters?.city) params.append('city', filters.city)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    
    const queryString = params.toString()
    const url = queryString 
      ? `${this.baseURL}/cash/stats?${queryString}` 
      : `${this.baseURL}/cash/stats`
    
    const response = await this.safeFetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения статистики кассы')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { 
      data: { totalIncome: 0, totalExpense: 0, balance: 0, incomeCount: 0, expenseCount: 0 } 
    })
    return result.data || result
  }

  /**
   * 🔧 FIX: Получить транзакции с серверной пагинацией
   * Больше не загружаем 10000 записей - только нужную страницу
   */
  async getCashTransactionsPaginated(params?: {
    page?: number
    limit?: number
    type?: 'приход' | 'расход'
    city?: string
    startDate?: string
    endDate?: string
    paymentPurpose?: string
  }): Promise<CashTransactionsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.type) queryParams.append('type', params.type)
    if (params?.city) queryParams.append('city', params.city)
    // 🔧 FIX: Добавляем параметры дат и назначения платежа
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.paymentPurpose) queryParams.append('paymentPurpose', params.paymentPurpose)
    
    const queryString = queryParams.toString()
    const url = queryString 
      ? `${this.baseURL}/cash?${queryString}` 
      : `${this.baseURL}/cash`
    
    const response = await this.safeFetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения транзакций')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { 
      data: [], 
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } 
    })
    
    return {
      data: result.data || [],
      pagination: result.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
    }
  }

  /**
   * @deprecated Используйте getCashTransactionsPaginated + getCashStats
   * Оставлено для обратной совместимости, но загружает только 100 записей
   */
  async getCashTransactions(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?limit=100`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения транзакций')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    const data = result.data || result
    
    const sortedData = (Array.isArray(data) ? data : []).sort((a: CashTransaction, b: CashTransaction) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return sortedData
  }

  /**
   * @deprecated Используйте getCashTransactionsPaginated с type='приход' + getCashStats
   */
  async getCashIncome(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?type=приход&limit=100`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения приходов')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    return result.data || result
  }

  /**
   * @deprecated Используйте getCashTransactionsPaginated с type='расход' + getCashStats
   */
  async getCashExpense(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?type=расход&limit=100`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения расходов')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    return result.data || result
  }

  async createCashTransaction(data: Partial<CashTransaction>): Promise<CashTransaction> {
    logger.debug('Creating cash transaction', { name: data.name, amount: data.amount })
    
    const response = await this.safeFetch(`${this.baseURL}/cash`, {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        amount: data.amount || 0,
        city: data.city,
        note: data.note,
        paymentPurpose: data.paymentPurpose,
        receiptDoc: data.receiptDoc,
        receiptDocs: data.receiptDocs, // Массив чеков для расходов
      }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка создания транзакции')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async checkCashTransactionByOrder(orderId: number): Promise<CashTransaction | null> {
    const response = await this.safeFetch(`${this.baseURL}/cash?orderId=${orderId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const errorMessage = await extractErrorMessage(response, 'Ошибка проверки транзакции')
      throw new Error(errorMessage)
    }

    try {
      return await safeParseJson<CashTransaction | null>(response, null)
    } catch {
      return null
    }
  }

  async updateCashTransactionByOrder(orderId: number, data: Partial<CashTransaction>): Promise<CashTransaction> {
    logger.debug('Updating cash transaction for order', { orderId })
    
    const transactions = await this.getCashTransactions()
    const transaction = transactions.find((t: any) => t.orderId === orderId)
    
    if (!transaction) {
      throw new Error('Транзакция не найдена')
    }
    
    const response = await this.safeFetch(`${this.baseURL}/cash/${transaction.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка обновления транзакции')
      throw new Error(errorMessage)
    }

    return safeParseJson(response)
  }

  async getCashBalance(): Promise<{ income: number; expense: number; balance: number }> {
    // Получаем все транзакции и считаем баланс на фронте
    const transactions = await this.getCashTransactions()
    
    const income = transactions
      .filter((t: any) => t.type === 'предоплата' && t.status === 'approved')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    
    const expense = transactions
      .filter((t: any) => t.type === 'расход' && t.status === 'approved')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    
    return {
      income,
      expense,
      balance: income - expense,
    }
    
    /* Старый код с отдельным endpoint
    const response = await fetch(`${this.baseURL}/cash/balance`, {
      method: 'GET',
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения баланса')
    }

    return response.json()
    */
  }

  async getCallsByOrderId(orderId: number): Promise<Call[]> {
    const response = await this.safeFetch(`${this.baseURL}/calls/order/${orderId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения записей звонков')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    return result.data || result
  }

  // Master Handover API (Cash Service - Handover)
  async getMasterHandoverSummary(): Promise<{ masters: any[], totalAmount: number }> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/summary`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения сводки сдачи мастеров')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async getMasterHandoverDetails(masterId: number): Promise<{ master: any, orders: any[] }> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/${masterId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения деталей сдачи мастера')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data || result
  }

  async approveMasterHandover(orderId: number): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/approve/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка одобрения сдачи')
      throw new Error(errorMessage)
    }
  }

  async rejectMasterHandover(orderId: number): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/reject/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка отклонения сдачи')
      throw new Error(errorMessage)
    }
  }

  /**
   * 🍪 Загрузка файлов с httpOnly cookies
   */
  async uploadReceipt(file: File, type: 'cash' | 'order'): Promise<{ filePath: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/files/upload?folder=director/cash/receipt_doc`, {
      method: 'POST',
      headers: {
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка загрузки файла')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    if (!result.data?.key) {
      throw new Error('Backend не вернул key файла')
    }
    return { filePath: result.data.key }
  }

  // Reports API
  async getCityReport(filters?: { city?: string; startDate?: string; endDate?: string }): Promise<CityReport[]> {
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/reports/city?${queryString}` : `${this.baseURL}/reports/city`;
    
    const response = await this.safeFetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения отчета по городам')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    return result.data || result
  }

  async getCityDetailedReport(city: string): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/reports/city/${encodeURIComponent(city)}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения детального отчета по городу')
      throw new Error(errorMessage)
    }

    return safeParseJson(response)
  }

  async getMastersReport(filters?: { masterId?: number; city?: string; startDate?: string; endDate?: string }): Promise<MasterReport[]> {
    const params = new URLSearchParams();
    if (filters?.masterId) params.append('masterId', filters.masterId.toString());
    if (filters?.city) params.append('city', filters.city);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/reports/masters?${queryString}` : `${this.baseURL}/reports/masters`;
    
    const response = await this.safeFetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения отчета по мастерам')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: [] })
    return result.data || result
  }

  // Методы для работы с профилем пользователя
  async getCurrentUserProfile(): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/users/profile`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения профиля')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.success && result.data ? result.data : result
  }

  async updateUserProfile(data: {
    telegramId?: string;
    contract?: string;
    passport?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseURL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Cookies': 'true',
      },
      credentials: 'include' as RequestCredentials,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка обновления профиля')
      throw new Error(errorMessage)
    }

    return safeParseJson(response)
  }

  // 🍪 Методы для загрузки файлов директоров с httpOnly cookies
  private async uploadFile(file: File, folder: string, errorMessage: string): Promise<{ filePath: string }> {
    logger.debug('Uploading file', { name: file.name, size: file.size, folder })
    
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/files/upload?folder=${folder}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Use-Cookies': 'true',
      },
      body: formData,
    })

    if (!response.ok) {
      const message = await extractErrorMessage(response, errorMessage)
      throw new Error(message)
    }

    const result = await safeParseJson(response)
    if (!result.data?.key) {
      throw new Error('Backend не вернул key файла')
    }
    return { filePath: result.data.key }
  }

  async uploadDirectorContract(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/directors/contract_doc', 'Ошибка загрузки договора')
  }

  async uploadDirectorPassport(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/directors/passport_doc', 'Ошибка загрузки паспорта')
  }

  async uploadMasterContract(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/masters/contract_doc', 'Ошибка загрузки договора мастера')
  }

  async uploadMasterPassport(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/masters/passport_doc', 'Ошибка загрузки паспорта мастера')
  }

  async uploadOrderBso(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/orders/bso_doc', 'Ошибка загрузки БСО заказа')
  }

  async uploadOrderExpenditure(file: File): Promise<{ filePath: string }> {
    return this.uploadFile(file, 'director/orders/expenditure_doc', 'Ошибка загрузки документа расхода заказа')
  }

  // Avito Chat API
  async getOrderAvitoChat(orderId: number): Promise<{ chatId: string; avitoAccountName: string; clientName: string; phone: string } | null> {
    const response = await this.safeFetch(`${this.baseURL}/orders/${orderId}/avito-chat`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения данных чата Авито')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data
  }

  async getAvitoMessages(chatId: string, avitoAccountName: string, limit: number = 100): Promise<any[]> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages?avitoAccountName=${avitoAccountName}&limit=${limit}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения сообщений')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: { messages: [] } })
    return result.data?.messages || []
  }

  async sendAvitoMessage(chatId: string, text: string, avitoAccountName: string): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, avitoAccountName }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка отправки сообщения')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response)
    return result.data
  }

  async markAvitoChatAsRead(chatId: string, avitoAccountName: string): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/read`, {
      method: 'POST',
      body: JSON.stringify({ avitoAccountName }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка отметки чата как прочитанного')
      throw new Error(errorMessage)
    }
  }

  // Orders History API - получить заказы по номеру телефона
  async getOrdersByPhone(phone: string): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      clientName: string;
      cityId: number;
      city?: { id: number; name: string };
      statusId: number;
      status?: { id: number; name: string; code: string };
      dateMeeting: string;
      equipmentTypeId: number;
      equipmentType?: { id: number; name: string };
      typeOrder: string;
      comment?: string;
      createdAt: string;
      rkId: number;
      rk?: { id: number; name: string };
      address: string;
      result: number | null;
      master: { id: number; name: string } | null;
    }>;
  }> {
    // Нормализуем номер телефона
    const normalizedPhone = phone.replace(/[\s\+\(\)\-]/g, '')
    
    const response = await this.safeFetch(`${this.baseURL}/orders/by-phone/${encodeURIComponent(normalizedPhone)}`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [] }
      }
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения истории заказов')
      throw new Error(errorMessage)
    }

    return safeParseJson(response, { success: true, data: [] })
  }

  async getAvitoVoiceUrls(avitoAccountName: string, voiceIds: string[]): Promise<{ [key: string]: string }> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/voice-files?avitoAccountName=${avitoAccountName}`, {
      method: 'POST',
      body: JSON.stringify({ voiceIds }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения URL голосовых сообщений')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { data: {} })
    return result.data || {}
  }

  // Orders History API - получить историю изменений заказа
  async getOrderHistory(orderId: number): Promise<OrderHistoryItem[]> {
    const response = await this.safeFetch(`${this.baseURL}/orders/${orderId}/history`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      const errorMessage = await extractErrorMessage(response, 'Ошибка получения истории изменений')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, [])
    return Array.isArray(result) ? result : (result.data || [])
  }

  // Push Notifications API (Director)
  async subscribeToPush(subscription: PushSubscriptionJSON): Promise<{ success: boolean }> {
    const response = await this.safeFetch(`${this.baseURL}/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка подписки на уведомления')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { success: false })
    return result
  }

  async unsubscribeFromPush(endpoint: string): Promise<{ success: boolean }> {
    const response = await this.safeFetch(`${this.baseURL}/push/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка отписки от уведомлений')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { success: false })
    return result
  }

  async sendTestPush(): Promise<{ success: boolean }> {
    const response = await this.safeFetch(`${this.baseURL}/push/test`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response, 'Ошибка отправки тестового уведомления')
      throw new Error(errorMessage)
    }

    const result = await safeParseJson(response, { success: false })
    return result
  }
}

// Типы для истории заказа
export interface OrderHistoryItem {
  id: number;
  timestamp: string;
  eventType: 'order.create' | 'order.update' | 'order.close' | 'order.status.change';
  userId?: number;
  role?: string;
  login?: string;
  userName?: string;
  metadata?: {
    orderId?: number;
    changes?: Record<string, { old: string | number | null; new: string | number | null }>;
    oldStatus?: string;
    newStatus?: string;
    result?: string;
    expenditure?: string;
    clean?: string;
    city?: string;
    clientName?: string;
    phone?: string;
  };
}

// Push Notifications
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const apiClient = new ApiClient()
