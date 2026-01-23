import { fetchWithRetry as fetchWithRetryUtil, getUserFriendlyErrorMessage, classifyNetworkError, type NetworkError } from './fetch-with-retry'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

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
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithRetryUtil(url, {
      ...options,
      retryOptions: {
        maxRetries: 2,        // Всего 2 повторные попытки (итого 3 запроса)
        retryDelay: 1000,     // 1 секунда между попытками
        backoff: true,        // Экспоненциальная задержка (1s, 2s, 4s...)
        timeout: 10000,       // 10 секунд таймаут (меньше чем у прокси/ingress чтобы избежать 502)
        retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'], // Только на эти ошибки
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
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Отключаем кэширование API запросов
          'Pragma': 'no-cache', // Для старых браузеров
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
    if (result.success && result.data && result.data.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user))
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
      console.error('[Logout] Failed to clear saved credentials:', error)
    }

    try {
      console.log('🚪 Sending logout request to server...')
      // Отправляем запрос на сервер для очистки cookies
      const response = await this.safeFetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({}), // Пустой объект для POST запроса
      })
      console.log('✅ Logout response:', response.status, response.statusText)
      const data = await response.json()
      console.log('📦 Logout data:', data)
    } catch (error) {
      console.error('❌ Ошибка при выходе на сервере:', error)
    } finally {
      // Очищаем локальные данные
      this.clearToken()
      console.log('🧹 Local data cleared')
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
      // 🍪 Headers добавляются автоматически в safeFetch
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения заказа')
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения статистики')
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
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

  // Employees API
  async getEmployees(): Promise<Employee[]> {
    const response = await this.safeFetch(`${this.baseURL}/employees`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сотрудников')
    }

    const result = await response.json()
    const data = result.data || result
    return Array.isArray(data) ? data : []
  }

  async getEmployee(id: number): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees/${id}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сотрудника')
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
    return result.data || result
  }

  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка создания сотрудника')
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
    return result.data || result
  }

  async updateEmployee(id: number, data: CreateEmployeeDto): Promise<Employee> {
    const response = await this.safeFetch(`${this.baseURL}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка обновления сотрудника')
    }

    const result = await response.json()
    // API возвращает данные в формате {success: true, data: {...}}
    return result.data || result
  }

  // Cash API (Cash Service)
  async getCashTransactions(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?limit=10000`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения транзакций')
    }

    const result = await response.json()
    const data = result.data || result
    
    // Сортируем по дате создания (новые сначала)
    const sortedData = data.sort((a: CashTransaction, b: CashTransaction) => 
      new Date(b.dateCreate).getTime() - new Date(a.dateCreate).getTime()
    )
    
    return sortedData
  }

  async getCashIncome(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?type=приход&limit=10000`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения приходов')
    }

    const result = await response.json()
    return result.data || result
  }

  async getCashExpense(): Promise<CashTransaction[]> {
    const response = await this.safeFetch(`${this.baseURL}/cash?type=расход&limit=10000`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения расходов')
    }

    const result = await response.json()
    return result.data || result
  }

  async createCashTransaction(data: Partial<CashTransaction>): Promise<CashTransaction> {
    console.log('Creating cash transaction with data:', data)
    
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
      try {
        const error = await response.json()
        console.error('Cash transaction creation error:', error)
        throw new Error(error.message || `Ошибка создания транзакции: ${response.status}`)
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        throw new Error(`Ошибка создания транзакции: ${response.status} ${response.statusText}`)
      }
    }

    const result = await response.json()
    return result.data || result
  }

  async checkCashTransactionByOrder(orderId: number): Promise<CashTransaction | null> {
    const response = await this.safeFetch(`${this.baseURL}/cash?orderId=${orderId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // Транзакция не найдена
      }
      const error = await response.json()
      throw new Error(error.message || 'Ошибка проверки транзакции')
    }

    // Проверяем, есть ли контент для парсинга
    const text = await response.text()
    if (!text) {
      return null
    }

    return JSON.parse(text)
  }

  async updateCashTransactionByOrder(orderId: number, data: Partial<CashTransaction>): Promise<CashTransaction> {
    console.log('Updating cash transaction for order:', orderId, 'with data:', data)
    
    // Сначала найти транзакцию по orderId
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
      try {
        const text = await response.text()
        console.error('Cash transaction update error response:', text)
        
        if (text) {
          const error = JSON.parse(text)
          throw new Error(error.message || `Ошибка обновления транзакции: ${response.status}`)
        } else {
          throw new Error(`Ошибка обновления транзакции: ${response.status} ${response.statusText}`)
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        throw new Error(`Ошибка обновления транзакции: ${response.status} ${response.statusText}`)
      }
    }

    return response.json()
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения записей звонков')
    }

    const result = await response.json()
    return result.data || result
  }

  // Master Handover API
  // Master Handover API (Cash Service - Handover)
  async getMasterHandoverSummary(): Promise<{ masters: any[], totalAmount: number }> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/summary`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сводки сдачи мастеров')
    }

    const result = await response.json()
    console.log('API Response:', result)
    // API возвращает {success: true, data: {masters: [...], totalAmount: ...}}
    // Нужно извлечь data
    const data = result.data || result
    console.log('Extracted data:', data)
    return data
  }

  async getMasterHandoverDetails(masterId: number): Promise<{ master: any, orders: any[] }> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/${masterId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения деталей сдачи мастера')
    }

    const result = await response.json()
    return result.data || result
  }

  async approveMasterHandover(orderId: number): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/approve/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка одобрения сдачи')
    }
  }

  async rejectMasterHandover(orderId: number): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/master-handover/reject/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отклонения сдачи')
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка загрузки файла')
    }

    const result = await response.json()
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения отчета по городам')
    }

    const result = await response.json()
    return result.data || result
  }

  async getCityDetailedReport(city: string): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/reports/city/${encodeURIComponent(city)}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения детального отчета по городу')
    }

    return response.json()
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения отчета по мастерам')
    }

    const result = await response.json()
    return result.data || result
  }

  // Методы для работы с профилем пользователя
  async getCurrentUserProfile(): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/users/profile`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения профиля')
    }

    const result = await response.json()
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка обновления профиля')
    }

    return response.json()
  }

  // 🍪 Методы для загрузки файлов директоров с httpOnly cookies
  async uploadDirectorContract(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем договор: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/directors/contract_doc`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки договора')
      }

      const result = await response.json()
      if (!result.data?.key) {
        throw new Error('Backend не вернул key файла')
      }
      return { filePath: result.data.key }
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error)
      throw error
    }
  }

  async uploadDirectorPassport(file: File): Promise<{ filePath: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/files/upload?folder=director/directors/passport_doc`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Use-Cookies': 'true',
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка загрузки паспорта')
    }

    const result = await response.json()
    if (!result.data?.key) {
      throw new Error('Backend не вернул key файла')
    }
    return { filePath: result.data.key }
  }

  async uploadMasterContract(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем договор мастера: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/masters/contract_doc`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки договора мастера')
      }

      const result = await response.json()
      if (!result.data?.key) {
        throw new Error('Backend не вернул key файла')
      }
      return { filePath: result.data.key }
    } catch (error) {
      console.error('Ошибка при загрузке договора мастера:', error)
      throw error
    }
  }

  async uploadMasterPassport(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем паспорт мастера: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/masters/passport_doc`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки паспорта мастера')
      }

      const result = await response.json()
      if (!result.data?.key) {
        throw new Error('Backend не вернул key файла')
      }
      return { filePath: result.data.key }
    } catch (error) {
      console.error('Ошибка при загрузке паспорта мастера:', error)
      throw error
    }
  }

  async uploadOrderBso(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем БСО заказа: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/orders/bso_doc`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки БСО заказа')
      }

      const result = await response.json()
      // ВАЖНО: ВСЕГДА используем только key, НИКОГДА не url!
      // key - это путь типа "director/orders/bso_doc/xxx.jpg"
      // url - это временный signed URL который истекает через час
      if (!result.data?.key) {
        throw new Error('Backend не вернул key файла')
      }
      return { filePath: result.data.key }
    } catch (error) {
      console.error('Ошибка при загрузке БСО заказа:', error)
      throw error
    }
  }

  async uploadOrderExpenditure(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем документ расхода заказа: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/orders/expenditure_doc`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки документа расхода заказа')
      }

      const result = await response.json()
      // ВАЖНО: ВСЕГДА используем только key, НИКОГДА не url!
      if (!result.data?.key) {
        throw new Error('Backend не вернул key файла')
      }
      return { filePath: result.data.key }
    } catch (error) {
      console.error('Ошибка при загрузке документа расхода заказа:', error)
      throw error
    }
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
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения данных чата Авито')
    }

    const result = await response.json()
    return result.data
  }

  async getAvitoMessages(chatId: string, avitoAccountName: string, limit: number = 100): Promise<any[]> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages?avitoAccountName=${avitoAccountName}&limit=${limit}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сообщений')
    }

    const result = await response.json()
    return result.data?.messages || []
  }

  async sendAvitoMessage(chatId: string, text: string, avitoAccountName: string): Promise<any> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отправки сообщения')
    }

    const result = await response.json()
    return result.data
  }

  async markAvitoChatAsRead(chatId: string, avitoAccountName: string): Promise<void> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/chats/${chatId}/read`, {
      method: 'POST',
      body: JSON.stringify({ avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отметки чата как прочитанного')
    }
  }

  async getAvitoVoiceUrls(avitoAccountName: string, voiceIds: string[]): Promise<{ [key: string]: string }> {
    const response = await this.safeFetch(`${this.baseURL}/avito-messenger/voice-files?avitoAccountName=${avitoAccountName}`, {
      method: 'POST',
      body: JSON.stringify({ voiceIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения URL голосовых сообщений')
    }

    const result = await response.json()
    return result.data || {}
  }
}

export const apiClient = new ApiClient()
