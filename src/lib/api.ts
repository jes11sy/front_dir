import { fetchWithRetry as fetchWithRetryUtil, getUserFriendlyErrorMessage, classifyNetworkError, type NetworkError } from './fetch-with-retry'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'

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
  bsoDoc?: string | null
  expenditureDoc?: string | null
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
    closedOrders: number  // Количество заказов со статусом "Готово" или "Отказ"
    refusals: number      // Заказы со статусом "Отказ"
    notOrders: number     // Заказы со статусом "Незаказ"
    totalClean: number    // Сумма чистыми по закрытым заказам
    totalMasterChange: number  // Сумма сдача мастера
    avgCheck: number      // Средний чек = totalClean / closedOrders
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
  private refreshSubscribers: ((token: string) => void)[] = []

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    
    // Запускаем проверку истечения токена
    if (typeof window !== 'undefined') {
      this.startTokenExpiryCheck()
    }
  }

  // Проверка истечения токена и проактивное обновление
  private startTokenExpiryCheck() {
    if (typeof window === 'undefined') return

    // Проверяем каждые 60 секунд
    setInterval(() => {
      const token = this.getToken()
      if (!token) return

      try {
        // Декодируем JWT токен
        const base64Url = token.split('.')[1]
        if (!base64Url) return

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )

        const payload = JSON.parse(jsonPayload)
        
        // Проверяем, когда истекает токен
        if (payload.exp) {
          const expiryTime = payload.exp * 1000 // Конвертируем в миллисекунды
          const currentTime = Date.now()
          const timeUntilExpiry = expiryTime - currentTime

          // Если токен истекает через 2 минуты или меньше, обновляем его проактивно
          if (timeUntilExpiry > 0 && timeUntilExpiry < 2 * 60 * 1000) {
            console.log('⏰ Токен скоро истечет, проактивно обновляем...')
            this.refreshAccessToken().catch(err => {
              console.error('Ошибка проактивного обновления токена:', err)
            })
          }
        }
      } catch (error) {
        // Игнорируем ошибки декодирования
      }
    }, 60000) // Проверяем каждую минуту
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Получить access токен из хранилища
   * БЕЗОПАСНОСТЬ: Приоритет sessionStorage (более безопасное) над localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    // Сначала проверяем sessionStorage (безопаснее - очищается при закрытии вкладки)
    return sessionStorage.getItem('access_token') || localStorage.getItem('access_token')
  }

  /**
   * Получить refresh токен из хранилища
   * БЕЗОПАСНОСТЬ: Приоритет sessionStorage над localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    // Сначала проверяем sessionStorage (безопаснее)
    return sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token')
  }

  /**
   * Сохранить access токен
   * БЕЗОПАСНОСТЬ: По умолчанию remember=false для использования sessionStorage
   * @param token - access токен
   * @param remember - true = localStorage (постоянно), false = sessionStorage (до закрытия вкладки)
   */
  private setToken(token: string, remember: boolean = false) {
    if (typeof window === 'undefined') return
    
    if (remember) {
      // ТОЛЬКО если пользователь явно выбрал "Запомнить меня"
      localStorage.setItem('access_token', token)
      localStorage.setItem('remember_me', 'true')
      // Очищаем sessionStorage чтобы избежать дублирования
      sessionStorage.removeItem('access_token')
    } else {
      // ПО УМОЛЧАНИЮ: sessionStorage (безопаснее - очищается при закрытии)
      sessionStorage.setItem('access_token', token)
      // Очищаем localStorage для безопасности
      localStorage.removeItem('access_token')
      localStorage.removeItem('remember_me')
    }
  }

  /**
   * Сохранить refresh токен
   * БЕЗОПАСНОСТЬ: По умолчанию remember=false для использования sessionStorage
   * @param refreshToken - refresh токен
   * @param remember - true = localStorage, false = sessionStorage
   */
  private setRefreshToken(refreshToken: string, remember: boolean = false) {
    if (typeof window === 'undefined') return
    
    if (remember) {
      localStorage.setItem('refresh_token', refreshToken)
      sessionStorage.removeItem('refresh_token')
    } else {
      // ПО УМОЛЧАНИЮ: sessionStorage (безопаснее)
      sessionStorage.setItem('refresh_token', refreshToken)
      localStorage.removeItem('refresh_token')
    }
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token))
    this.refreshSubscribers = []
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
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
        timeout: 30000,       // 30 секунд таймаут
        retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'], // Только на эти ошибки
      },
    })
  }

  /**
   * Обновление access токена через refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return null
      }

      const result = await response.json()
      const data = result.data || result
      
      const newAccessToken = data.accessToken
      const newRefreshToken = data.refreshToken

      if (newAccessToken && newRefreshToken) {
        // Сохраняем токены с учетом настройки "Запомнить меня"
        const remember = typeof window !== 'undefined' && localStorage.getItem('remember_me') === 'true'
        this.setToken(newAccessToken, remember)
        this.setRefreshToken(newRefreshToken, remember)
        return newAccessToken
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Безопасная обработка fetch запросов с автоматическим обновлением токена и retry
   */
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      // Используем fetchWithRetry для GET запросов (безопасно повторять)
      // POST/PUT/DELETE запросы не повторяем автоматически (могут изменить данные дважды)
      const shouldRetry = !options?.method || options.method === 'GET'
      
      const response = shouldRetry 
        ? await this.fetchWithRetry(url, options)
        : await fetch(url, options)
      
      // Если 401 ошибка и это не логин/рефреш - пытаемся обновить токен
      if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
        if (this.isRefreshing) {
          // Если токен уже обновляется, ждем завершения
          return new Promise((resolve) => {
            this.addRefreshSubscriber((token: string) => {
              // Повторяем запрос с новым токеном
              const newOptions = {
                ...options,
                headers: {
                  ...options?.headers,
                  Authorization: `Bearer ${token}`,
                },
              }
              resolve(fetch(url, newOptions))
            })
          })
        }

        this.isRefreshing = true

        const newToken = await this.refreshAccessToken()
        
        this.isRefreshing = false

        if (newToken) {
          this.onRefreshed(newToken)

          // Повторяем оригинальный запрос с новым токеном
          const newOptions = {
            ...options,
            headers: {
              ...options?.headers,
              Authorization: `Bearer ${newToken}`,
            },
          }
          return fetch(url, newOptions)
        } else {
          // Не удалось обновить токен - редирект на логин
          this.logout()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          // Выбрасываем специальную ошибку, чтобы прервать выполнение
          throw new Error('SESSION_EXPIRED')
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

  async login(login: string, password: string, remember: boolean = false): Promise<LoginResponse> {
    const response = await this.safeFetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        login, 
        password,
        role: 'director' // Director фронтенд всегда использует роль director
      }),
    })

    if (!response.ok) {
      // Безопасная обработка ошибки - проверяем Content-Type
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

    // Новый формат ответа: { success, message, data: { user, accessToken, refreshToken } }
    const result = await response.json()
    // Адаптируем к старому формату для совместимости
    if (result.success && result.data) {
      // Сохраняем токены с учетом remember
      this.setToken(result.data.accessToken, remember)
      this.setRefreshToken(result.data.refreshToken, remember)
      
      // Сохраняем пользователя с учетом безопасности
      if (typeof window !== 'undefined') {
        if (remember) {
          localStorage.setItem('user', JSON.stringify(result.data.user))
          sessionStorage.removeItem('user') // Очищаем для безопасности
        } else {
          sessionStorage.setItem('user', JSON.stringify(result.data.user))
          localStorage.removeItem('user') // Очищаем для безопасности
        }
      }
      
      return {
        access_token: result.data.accessToken,
        refresh_token: result.data.refreshToken,
        user: result.data.user
      }
    }
    return result
  }

  async getProfile(): Promise<User> {
    const response = await this.safeFetch(`${this.baseURL}/users/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      // Безопасная обработка ошибки
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

    // Новый формат: { success, data: { ...user, role } }
    const result = await response.json()
    return result.success && result.data ? result.data : result
  }

  async logout(): Promise<void> {
    // Сначала очищаем локальные данные
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('remember_me')
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    }

    // Затем пытаемся уведомить сервер (необязательно)
    const token = this.getToken()
    if (token) {
      try {
        await this.safeFetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        })
      } catch (error) {
        // Игнорируем ошибку - токен уже удален локально
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
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
    master?: string
  } = {}): Promise<OrdersResponse> {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.status) searchParams.append('status', params.status)
    if (params.city) searchParams.append('city', params.city)
    if (params.search) searchParams.append('search', params.search)
    if (params.master) searchParams.append('master', params.master)
    
    const response = await this.safeFetch(`${this.baseURL}/orders?${searchParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения заказов')
    }

    return response.json()
  }

  async getOrder(id: number): Promise<Order> {
    const response = await this.safeFetch(`${this.baseURL}/orders/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/orders/stats/summary`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения статусов')
    }

    const result = await response.json()
    return result.data || result
  }

  // Masters API (Users Service)
  async getMasters(): Promise<Master[]> {
    const response = await this.safeFetch(`${this.baseURL}/masters`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения мастеров')
    }

    const result = await response.json()
    return result.data || result
  }

  // Employees API
  async getEmployees(): Promise<Employee[]> {
    const response = await fetch(`${this.baseURL}/employees`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/employees/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/employees`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/employees/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/cash`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/cash?type=приход`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения приходов')
    }

    const result = await response.json()
    return result.data || result
  }

  async getCashExpense(): Promise<CashTransaction[]> {
    const response = await fetch(`${this.baseURL}/cash?type=расход`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    
    const response = await fetch(`${this.baseURL}/cash`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/cash?orderId=${orderId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    
    const response = await fetch(`${this.baseURL}/cash/${transaction.id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения баланса')
    }

    return response.json()
    */
  }

  async getCallsByOrderId(orderId: number): Promise<Call[]> {
    const response = await fetch(`${this.baseURL}/calls/order/${orderId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/master-handover/summary`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/master-handover/${masterId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения деталей сдачи мастера')
    }

    const result = await response.json()
    return result.data || result
  }

  async approveMasterHandover(orderId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/master-handover/approve/${orderId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка одобрения сдачи')
    }
  }

  async rejectMasterHandover(orderId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/master-handover/reject/${orderId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отклонения сдачи')
    }
  }

  // File Upload API
  async uploadReceipt(file: File, type: 'cash' | 'order'): Promise<{ filePath: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${this.baseURL}/files/upload?folder=director/cash/receipt_doc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Не устанавливаем Content-Type для FormData - браузер сам установит правильный
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка загрузки файла')
    }

    const result = await response.json()
    return { filePath: result.data?.key || result.data?.url }
  }

  // Reports API
  async getCityReport(filters?: { city?: string; startDate?: string; endDate?: string }): Promise<CityReport[]> {
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/reports/city?${queryString}` : `${this.baseURL}/reports/city`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения отчета по городам')
    }

    const result = await response.json()
    return result.data || result
  }

  async getCityDetailedReport(city: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/reports/city/${encodeURIComponent(city)}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/users/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка обновления профиля')
    }

    return response.json()
  }

  // Методы для загрузки файлов директоров
  async uploadDirectorContract(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем договор: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/directors/contract_doc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки договора')
      }

      const result = await response.json()
      return { filePath: result.data?.key || result.data?.url }
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
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка загрузки паспорта')
    }

    const result = await response.json()
    return { filePath: result.data?.key || result.data?.url }
  }

  async uploadMasterContract(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем договор мастера: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/files/upload?folder=director/masters/contract_doc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки договора мастера')
      }

      const result = await response.json()
      return { filePath: result.data?.key || result.data?.url }
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
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки паспорта мастера')
      }

      const result = await response.json()
      return { filePath: result.data?.key || result.data?.url }
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
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки БСО заказа')
      }

      const result = await response.json()
      return { filePath: result.data?.key || result.data?.url }
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
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка загрузки документа расхода заказа')
      }

      const result = await response.json()
      return { filePath: result.data?.key || result.data?.url }
    } catch (error) {
      console.error('Ошибка при загрузке документа расхода заказа:', error)
      throw error
    }
  }

  // Avito Chat API
  async getOrderAvitoChat(orderId: number): Promise<{ chatId: string; avitoAccountName: string; clientName: string; phone: string } | null> {
    const response = await fetch(`${this.baseURL}/orders/${orderId}/avito-chat`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages?avitoAccountName=${avitoAccountName}&limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения сообщений')
    }

    const result = await response.json()
    return result.data?.messages || []
  }

  async sendAvitoMessage(chatId: string, text: string, avitoAccountName: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
    const response = await fetch(`${this.baseURL}/avito-messenger/chats/${chatId}/read`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ avitoAccountName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка отметки чата как прочитанного')
    }
  }
}

export const apiClient = new ApiClient()
