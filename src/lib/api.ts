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
  rk: string
  city: string
  avitoName?: string
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  typeEquipment: string
  problem: string
  callRecord?: string
  statusOrder: string
  masterId?: number
  result?: number
  expenditure?: number
  clean?: number
  masterChange?: number
  bsoDoc?: string[] | null
  expenditureDoc?: string[] | null
  operatorNameId: number
  createDate: string
  closingData?: string
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
  cities: string[]
  statusWork: string
}

export interface Call {
  id: number
  rk: string
  city: string
  avitoName?: string
  phoneClient: string
  phoneAts: string
  dateCreate: string
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
  cities: string[]
  statusWork: string
  dateCreate: string
  note?: string
  tgId?: string
  chatId?: string
  passportDoc?: string
  contractDoc?: string
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeDto {
  name: string
  login?: string
  password?: string
  cities?: string[]
  statusWork?: string
  note?: string
  tgId?: string
  chatId?: string
  passportDoc?: string
  contractDoc?: string
}

export interface CashTransaction {
  id: number
  name: string
  amount: number
  city?: string
  note?: string
  receiptDoc?: string
  paymentPurpose?: string
  dateCreate: string
  nameCreate: string
  createdAt: string
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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    // 🍪 Токены теперь хранятся в httpOnly cookies на сервере
    // Не нужно проверять истечение - сервер сам обработает
  }

  // 🍪 Проверка токенов не нужна - они в httpOnly cookies на сервере

  // 🍪 Authorization через httpOnly cookies

  // 🍪 Токены в httpOnly cookies - не нужны get/set методы

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
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      // Используем fetchWithRetry для refresh токена чтобы избежать 502
      const response = await this.fetchWithRetry(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      return response.ok
    } catch (error) {
      return false
    }
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
      
      // Если 401/403 ошибка и это не логин/рефреш - пытаемся обновить токен
      // 403 может быть из-за истекшего токена, который прошел JWT validation но не прошел роли
      if ((response.status === 401 || response.status === 403) && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
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
            // Не удалось обновить токен - редирект на логин
            this.isRefreshing = false
            this.logout()
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            // Выбрасываем специальную ошибку, чтобы прервать выполнение
            throw new Error('SESSION_EXPIRED')
          }
        } catch (error) {
          this.isRefreshing = false
          // Если ошибка при обновлении токена - тоже редирект на логин
          if (error instanceof Error && error.message !== 'SESSION_EXPIRED') {
            this.logout()
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
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
   * 🍪 Авторизация с httpOnly cookies
   * Токены автоматически устанавливаются сервером в cookies
   * 
   * @param login - Логин директора
   * @param password - Пароль
   *   ⚠️ SECURITY: НЕ логировать, НЕ сохранять в storage
   *   Хэшируется на сервере через bcrypt (12 rounds)
   * @param remember - Запомнить на устройстве
   */
  async login(login: string, password: string, remember: boolean = false): Promise<LoginResponse> {
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
      if (typeof window !== 'undefined') {
        const { sanitizeObject } = await import('./sanitize')
        const sanitizedUser = sanitizeObject(result.data.user as Record<string, unknown>)
        // Всегда сохраняем в sessionStorage для текущей сессии
        sessionStorage.setItem('user', JSON.stringify(sanitizedUser))
        // И в localStorage для автологина при повторном открытии
        localStorage.setItem('user', JSON.stringify(sanitizedUser))
      }
      
      // Если включен "Запомнить меня" - сохраняем учетные данные в IndexedDB
      if (remember) {
        try {
          const { saveCredentials } = await import('./remember-me')
          await saveCredentials(login, password)
        } catch (error) {
          console.error('[Login] Failed to save credentials:', error)
          // Не прерываем процесс логина, если не удалось сохранить
        }
      }
      
      return {
        access_token: '', // Токены теперь в cookies
        refresh_token: '',
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
   */
  async logout(): Promise<void> {
    // Очищаем сохраненные учетные данные из IndexedDB
    try {
      const { clearSavedCredentials } = await import('./remember-me')
      await clearSavedCredentials()
    } catch (error) {
      logger.error('Failed to clear saved credentials', error)
    }

    try {
      logger.debug('Sending logout request to server')
      await this.safeFetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
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
   * Добавлен таймаут 5 секунд для PWA/мобильных устройств
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Таймаут 5 секунд для проверки авторизации
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      )
      
      await Promise.race([this.getProfile(), timeoutPromise])
      return true
    } catch {
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
    master?: string  // ID мастера (для обратной совместимости)
    rk?: string
    typeEquipment?: string
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
      if (params.master && params.master.trim()) queryParts.push(`masterId=${encodeURIComponent(params.master.trim())}`)
      if (params.rk && params.rk.trim()) queryParts.push(`rk=${encodeURIComponent(params.rk.trim())}`)
      if (params.typeEquipment && params.typeEquipment.trim()) queryParts.push(`typeEquipment=${encodeURIComponent(params.typeEquipment.trim())}`)
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

  async getFilterOptions(): Promise<{ rks: string[], typeEquipments: string[] }> {
    const response = await this.safeFetch(`${this.baseURL}/orders/filter-options`, {
      method: 'GET',
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      throw new Error('Ошибка получения опций фильтров')
    }

    try {
      const result = await response.json()
      return result.data || { rks: [], typeEquipments: [] }
    } catch {
      return { rks: [], typeEquipments: [] }
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
      statusWork: string
      cities: string[]
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
  }): Promise<CashTransactionsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.type) queryParams.append('type', params.type)
    if (params?.city) queryParams.append('city', params.city)
    
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
    
    // Сортируем по дате создания (новые сначала)
    const sortedData = (Array.isArray(data) ? data : []).sort((a: CashTransaction, b: CashTransaction) => 
      new Date(b.dateCreate).getTime() - new Date(a.dateCreate).getTime()
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
    contractDoc?: string;
    passportDoc?: string;
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
      city: string;
      statusOrder: string;
      dateMeeting: string;
      typeEquipment: string;
      typeOrder: string;
      problem: string;
      createdAt: string;
      rk: string;
      avitoName: string;
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
}

export const apiClient = new ApiClient()
