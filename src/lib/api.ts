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
  bsoDoc?: string
  expenditureDoc?: string
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
    total: number
    totalRevenue: number
    totalExpenditure: number
    totalClean: number
    totalMasterChange: number
    totalPrepayment: number
    totalCashSubmission: number
    avgRevenue: number
    avgExpenditure: number
    avgClean: number
    // Новая статистика по статусам
    closedOrders: number
    notOrders: number
    refusals: number
    ready: number
    avgCheck: number
  }
  calls: {
    total: number
  }
  cash: {
    totalTransactions: number
    totalAmount: number
    income: number
    expense: number
  }
  masters: {
    total: number
    working: number
    fired: number
  }
}

export interface MasterReport {
  masterId: number
  masterName: string
  city: string
  orders: {
    total: number
    totalRevenue: number
    totalExpenditure: number
    totalClean: number
    totalMasterChange: number
    avgCheck: number
  }
}

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
  }

  /**
   * Безопасная обработка fetch запросов
   */
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      // Используем logger вместо console.error
      throw new Error('Ошибка сети. Проверьте подключение к интернету.')
    }
  }

  async login(login: string, password: string): Promise<LoginResponse> {
    const response = await this.safeFetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        login, 
        password,
        role: 'DIRECTOR' // Director фронтенд всегда использует роль DIRECTOR
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

    // Новый формат ответа: { success, message, data: { user, access_token } }
    const result = await response.json()
    // Адаптируем к старому формату для совместимости
    if (result.success && result.data) {
      return {
        access_token: result.data.accessToken,
        user: result.data.user
      }
    }
    return result
  }

  async getProfile(): Promise<User> {
    const response = await this.safeFetch(`${this.baseURL}/auth/profile`, {
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
      localStorage.removeItem('user')
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

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
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

    const response = await fetch(`${this.baseURL}/orders?${searchParams}`, {
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
    const response = await fetch(`${this.baseURL}/orders/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения заказа')
    }

    return response.json()
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    const response = await fetch(`${this.baseURL}/orders/${id}`, {
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

    return response.json()
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

    return response.json()
  }

  async getOrderStatuses(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/orders/statuses`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ошибка получения статусов')
    }

    return response.json()
  }

  // Masters API (Users Service)
  async getMasters(): Promise<Master[]> {
    const response = await fetch(`${this.baseURL}/masters`, {
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

    return response.json()
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

    return response.json()
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

    return response.json()
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

    return response.json()
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
    return result.data || result
  }

  async getCashIncome(): Promise<CashTransaction[]> {
    const response = await fetch(`${this.baseURL}/cash?type=предоплата`, {
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
        orderId: data.orderId,
        amount: data.amount || 0,
        type: data.type || 'расход',
        note: data.note,
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

    return response.json()
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

    return response.json()
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

    return response.json()
  }

  async approveMasterHandover(orderId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/master-handover/approve/${orderId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
    formData.append('type', type)

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${this.baseURL}/upload/receipt`, {
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

    return response.json()
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

    return response.json()
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

    return response.json()
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

    return response.json()
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
    console.log(`Загружаем договор: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`Base URL: ${this.baseURL}`)
    console.log(`Token: ${this.getToken() ? 'есть' : 'нет'}`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/upload/director/contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          // НЕ устанавливаем Content-Type - браузер сам установит multipart/form-data
        },
        body: formData,
      })

      console.log(`Ответ сервера: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        console.error('Статус ответа:', response.status, response.statusText)
        console.error('URL запроса:', `${this.baseURL}/upload/director/contract`)
        
        let error
        try {
          error = await response.json()
          console.error('Ошибка загрузки договора (JSON):', error)
        } catch (parseError) {
          console.error('Не удалось распарсить ответ как JSON:', parseError)
          const textResponse = await response.text()
          console.error('Текстовый ответ сервера:', textResponse)
          throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`)
        }
        
        throw new Error(error.message || 'Ошибка загрузки договора')
      }

      const result = await response.json()
      console.log('Результат загрузки:', result)
      return result
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error)
      throw error
    }
  }

  async uploadDirectorPassport(file: File): Promise<{ filePath: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/upload/director/passport`, {
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

    return response.json()
  }

  async uploadMasterContract(file: File): Promise<{ filePath: string }> {
    console.log(`Загружаем договор мастера: ${file.name}, размер: ${file.size} байт (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/upload/master/contract`, {
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

      return await response.json()
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
      const response = await fetch(`${this.baseURL}/upload/master/passport`, {
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

      return await response.json()
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
      const response = await fetch(`${this.baseURL}/upload/order/bso`, {
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

      return await response.json()
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
      const response = await fetch(`${this.baseURL}/upload/order/expenditure`, {
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

      return await response.json()
    } catch (error) {
      console.error('Ошибка при загрузке документа расхода заказа:', error)
      throw error
    }
  }
}

export const apiClient = new ApiClient()
