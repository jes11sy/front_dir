"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { apiClient, Order } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'orders_scroll_position'

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Инициализация из URL query params (для сохранения состояния при возврате назад)
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page')
    return page ? parseInt(page, 10) : 1
  })
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') || '')
  const [masterFilter, setMasterFilter] = useState(() => searchParams.get('master') || '')
  const [showFilters, setShowFilters] = useState(() => {
    // Показываем фильтры если есть активные фильтры в URL
    return !!(searchParams.get('status') || searchParams.get('city') || searchParams.get('master') || 
              searchParams.get('rk') || searchParams.get('typeEquipment') || 
              searchParams.get('dateFrom') || searchParams.get('dateTo'))
  })
  
  // Новые фильтры
  const [rkFilter, setRkFilter] = useState(() => searchParams.get('rk') || '')
  const [typeEquipmentFilter, setTypeEquipmentFilter] = useState(() => searchParams.get('typeEquipment') || '')
  const [dateType, setDateType] = useState<'create' | 'close' | 'meeting'>(() => {
    const dt = searchParams.get('dateType')
    return (dt === 'create' || dt === 'close' || dt === 'meeting') ? dt : 'create'
  })
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || '')

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>([])
  const [allMasters, setAllMasters] = useState<{id: number, name: string}[]>([])
  const [allRks, setAllRks] = useState<string[]>([])
  const [allTypeEquipments, setAllTypeEquipments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Ref для отмены запросов (Race Condition fix)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const isInitialMount = useRef(true)
  const hasRestoredScroll = useRef(false)

  // Обновление URL с текущими фильтрами (без перезагрузки страницы)
  const updateUrlWithFilters = useCallback(() => {
    const params = new URLSearchParams()
    
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter) params.set('status', statusFilter)
    if (cityFilter) params.set('city', cityFilter)
    if (masterFilter) params.set('master', masterFilter)
    if (rkFilter) params.set('rk', rkFilter)
    if (typeEquipmentFilter) params.set('typeEquipment', typeEquipmentFilter)
    if (dateType !== 'create') params.set('dateType', dateType)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/orders?${queryString}` : '/orders'
    
    // Используем replaceState чтобы не засорять историю при каждом изменении фильтра
    window.history.replaceState(null, '', newUrl)
  }, [currentPage, searchTerm, statusFilter, cityFilter, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Сохранение позиции прокрутки перед переходом на страницу заказа
  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString())
    }
  }, [])

  // Восстановление позиции прокрутки при возврате
  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && !hasRestoredScroll.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedPosition) {
        // Небольшая задержка чтобы DOM успел отрендериться
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10))
          hasRestoredScroll.current = true
        }, 100)
      }
    }
  }, [])

  // Загрузка данных с защитой от Race Condition
  const loadOrders = useCallback(async (searchValue?: string) => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    // Уникальный ID запроса для проверки актуальности
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter?.trim() || undefined,
        city: cityFilter?.trim() || undefined,
        search: (searchValue ?? searchTerm)?.trim() || undefined,
        master: masterFilter?.trim() || undefined,
        rk: rkFilter?.trim() || undefined,
        typeEquipment: typeEquipmentFilter?.trim() || undefined,
        dateType: (dateFrom?.trim() || dateTo?.trim()) ? dateType : undefined,
        dateFrom: dateFrom?.trim() || undefined,
        dateTo: dateTo?.trim() || undefined,
      })
      
      // Проверяем, не устарел ли запрос
      if (currentRequestId !== requestIdRef.current) {
        return // Игнорируем устаревший ответ
      }
      
      // Остальные запросы
      const [statuses, mastersData, filterOptions] = await Promise.all([
        apiClient.getOrderStatuses().catch(() => ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ']),
        apiClient.getMasters().catch(() => []),
        apiClient.getFilterOptions().catch(() => ({ rks: [], typeEquipments: [] }))
      ])
      
      // Повторная проверка актуальности
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      
      // Фильтруем мастеров только со статусом "работает"
      const masters = (Array.isArray(mastersData) ? mastersData : []).filter(master => {
        const status = (master.statusWork || '').toLowerCase();
        return status.includes('работает') || status.includes('работающий') || status === 'active';
      });
      
      // API может возвращать данные в разных форматах - обрабатываем оба
      const responseData = response as any
      const ordersData = Array.isArray(responseData.data?.orders) 
        ? responseData.data.orders 
        : Array.isArray(responseData.data) 
          ? responseData.data 
          : []
      setOrders(ordersData)
      setAllStatuses(Array.isArray(statuses) ? statuses : ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
      setAllMasters(masters)
      
      setAllRks(filterOptions.rks || [])
      setAllTypeEquipments(filterOptions.typeEquipments || [])
      
      setPagination(responseData.data?.pagination || responseData.pagination || {
        page: 1,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0
      })
    } catch (err) {
      // Игнорируем ошибки отмененных запросов
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заказов')
      logger.error('Error loading orders', err)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [currentPage, itemsPerPage, statusFilter, cityFilter, searchTerm, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Загружаем данные при изменении фильтров (кроме searchTerm - у него свой дебаунс)
  useEffect(() => {
    if (itemsPerPage > 0) {
      loadOrders()
    }
    
    // Очистка при размонтировании
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentPage, statusFilter, cityFilter, masterFilter, itemsPerPage, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Обновляем URL при изменении фильтров (кроме первой загрузки)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    updateUrlWithFilters()
  }, [updateUrlWithFilters])

  // Восстанавливаем позицию прокрутки после загрузки данных
  useEffect(() => {
    if (!loading && orders.length > 0) {
      restoreScrollPosition()
    }
  }, [loading, orders.length, restoreScrollPosition])

  // Обработчики фильтров
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // Дебаунс для поиска с защитой от Race Condition
  useEffect(() => {
    if (searchTerm === '') return
    
    const timeoutId = setTimeout(() => {
      loadOrders(searchTerm)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleCityChange = (value: string) => {
    setCityFilter(value)
    setCurrentPage(1)
  }

  const handleMasterChange = (value: string) => {
    setMasterFilter(value)
    setCurrentPage(1)
  }

  const handleRkChange = (value: string) => {
    setRkFilter(value)
    setCurrentPage(1)
  }

  const handleTypeEquipmentChange = (value: string) => {
    setTypeEquipmentFilter(value)
    setCurrentPage(1)
  }

  const handleDateTypeChange = (value: 'create' | 'close' | 'meeting') => {
    setDateType(value)
    setCurrentPage(1)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    setCurrentPage(1)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    setCurrentPage(1)
  }

  // Получаем уникальные значения для фильтров из загруженных данных
  const safeOrders = Array.isArray(orders) ? orders : []
  const uniqueCities = Array.from(new Set(safeOrders.map(order => order.city)))

  // Сброс фильтров
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCityFilter('')
    setMasterFilter('')
    setRkFilter('')
    setTypeEquipmentFilter('')
    setDateType('create')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
    // Очищаем URL и сохраненную позицию
    window.history.replaceState(null, '', '/orders')
    sessionStorage.removeItem(SCROLL_POSITION_KEY)
  }

  const handleOrderClick = (orderId: number) => {
    // Сохраняем позицию прокрутки перед переходом
    saveScrollPosition()
    // Обновляем URL с текущими фильтрами
    updateUrlWithFilters()
    router.push(`/orders/${orderId}`)
  }

  // Функция для форматирования даты (с защитой от null/undefined/невалидных значений)
  // Упрощенная версия для мобильных браузеров которые могут не поддерживать сложные опции локали
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      // Простое форматирование без сложных опций локали (работает на всех устройствах)
      const day = String(date.getUTCDate()).padStart(2, '0')
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const year = date.getUTCFullYear()
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      
      return `${day}.${month}.${year} ${hours}:${minutes}`
    } catch {
      return '-'
    }
  }

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Готово': return '#059669'
      case 'В работе': return '#3b82f6'
      case 'Ожидает': return '#f59e0b'
      case 'Отказ': return '#ef4444'
      case 'Принял': return '#10b981'
      case 'В пути': return '#8b5cf6'
      case 'Модерн': return '#f97316'
      case 'Незаказ': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Функция для получения цвета типа заказа
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Впервые': return '#10b981'
      case 'Повтор': return '#f59e0b'
      case 'Гарантия': return '#ef4444'
      default: return '#6b7280'
    }
  }
  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-in-left">
                <p className="text-red-600 font-medium">{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Фильтры */}
            <div className="mb-6 animate-slide-in-left">
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h2>
                  <svg
                    className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${
                      showFilters ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4 animate-slide-in-right">
                  {/* Первая строка: Поиск и Статус */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Поиск */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Поиск (№, телефон, адрес)
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Введите номер, телефон или адрес..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Статус */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Статус
                      </label>
                      <Select value={statusFilter || "all"} onValueChange={(value) => handleStatusChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все статусы
                          </SelectItem>
                          {Array.isArray(allStatuses) && allStatuses.map(status => (
                            <SelectItem key={status} value={status} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Вторая строка: Город и Мастер */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Город */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Город
                      </label>
                      <Select value={cityFilter || "all"} onValueChange={(value) => handleCityChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все города" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все города
                          </SelectItem>
                          {Array.isArray(uniqueCities) && uniqueCities.map(city => (
                            <SelectItem key={city} value={city} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Мастер */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Мастер
                      </label>
                      <Select value={masterFilter || "all"} onValueChange={(value) => handleMasterChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все мастера" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все мастера
                          </SelectItem>
                          {Array.isArray(allMasters) && allMasters.map(master => (
                            <SelectItem key={master.id} value={master.id.toString()} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {master.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Третья строка: РК и Направление */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* РК */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        РК
                      </label>
                      <Select value={rkFilter || "all"} onValueChange={(value) => handleRkChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все РК" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все РК
                          </SelectItem>
                          {Array.isArray(allRks) && allRks.map(rk => (
                            <SelectItem key={rk} value={rk} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {rk}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Направление */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Направление
                      </label>
                      <Select value={typeEquipmentFilter || "all"} onValueChange={(value) => handleTypeEquipmentChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Все направления" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все направления
                          </SelectItem>
                          {Array.isArray(allTypeEquipments) && allTypeEquipments.map(type => (
                            <SelectItem key={type} value={type} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Четвёртая строка: Фильтр по дате */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Тип даты */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Фильтр по дате
                      </label>
                      <Select value={dateType} onValueChange={(value: 'create' | 'close' | 'meeting') => handleDateTypeChange(value)}>
                        <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800">
                          <SelectValue placeholder="Тип даты" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="create" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата создания
                          </SelectItem>
                          <SelectItem value="close" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата закрытия
                          </SelectItem>
                          <SelectItem value="meeting" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата встречи
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Дата от */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        С даты
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Дата до */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        По дату
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                  
                  {/* Кнопки управления фильтрами */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                    >
                      Сбросить
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Десктопная таблица */}
            {!loading && !error && safeOrders.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <p className="text-gray-500 font-medium">Нет заказов для отображения</p>
              </div>
            )}
            
            {!loading && !error && safeOrders.length > 0 && (
            <div className="hidden md:block animate-fade-in">
              <table className="w-full border-collapse text-xs bg-white rounded-lg shadow-lg">
                <thead>
                  <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Тип заказа</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">РК</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Город</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Имя мастера</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Телефон</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Клиент</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Адрес</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Дата встречи</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Направление</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Проблема</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Статус</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Мастер</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(safeOrders) && safeOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                      style={{borderColor: '#e5e7eb'}}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className="py-2 px-2 text-gray-800 font-medium">{order.id}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-800">{order.rk}</td>
                      <td className="py-2 px-2 text-gray-800">{order.city}</td>
                      <td className="py-2 px-2 text-gray-800">{order.avitoName || '-'}</td>
                      <td className="py-2 px-2 text-gray-800">{order.phone}</td>
                      <td className="py-2 px-2 text-gray-800">{order.clientName}</td>
                      <td className="py-2 px-2 text-gray-800">{order.address}</td>
                      <td className="py-2 px-2 text-gray-800">{formatDate(order.dateMeeting)}</td>
                      <td className="py-2 px-2 text-gray-800">{order.typeEquipment}</td>
                      <td className="py-2 px-2 text-gray-800">{order.problem}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-800">{order.master?.name || '-'}</td>
                      <td className="py-2 px-2 text-gray-800 font-semibold">
                        {order.result && typeof order.result === 'number' 
                          ? (() => {
                              try {
                                // Простое форматирование числа без локали (работает на всех устройствах)
                                return `${order.result.toLocaleString()} ₽`
                              } catch {
                                return `${order.result} ₽`
                              }
                            })()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Мобильные карточки */}
            {!loading && !error && safeOrders.length > 0 && (
            <div className="md:hidden space-y-4 animate-fade-in">
              {Array.isArray(safeOrders) && safeOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-teal-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-semibold">#{order.id}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className="text-gray-800 font-semibold">
                      {order.result && typeof order.result === 'number' 
                        ? (() => {
                            try {
                              // Простое форматирование числа без локали (работает на всех устройствах)
                              return `${order.result.toLocaleString()} ₽`
                            } catch {
                              return `${order.result} ₽`
                            }
                          })()
                        : '-'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Клиент:</span>
                      <span className="text-gray-800">{order.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Город:</span>
                      <span className="text-gray-800">{order.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дата встречи:</span>
                      <span className="text-gray-800">{formatDate(order.dateMeeting)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Мастер:</span>
                      <span className="text-gray-800">{order.master?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Проблема:</span>
                      <span className="text-gray-800">{order.problem}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                        {order.statusOrder}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}


            {/* Пагинация */}
            {!loading && !error && safeOrders.length > 0 && (pagination?.totalPages || 0) > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2 flex-wrap animate-fade-in">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  ←
                </button>
                
                {(() => {
                  const totalPages = pagination?.totalPages || 0
                  const pages = []
                  
                  // Показываем максимум 7 страниц
                  const maxVisible = 7
                  let startPage = Math.max(1, currentPage - 3)
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                  
                  // Корректируем если не хватает страниц в конце
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1)
                  }
                  
                  // Добавляем первую страницу и многоточие если нужно
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md"
                      >
                        1
                      </button>
                    )
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                      )
                    }
                  }
                  
                  // Добавляем видимые страницы
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                          currentPage === i
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  }
                  
                  // Добавляем последнюю страницу и многоточие если нужно
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                      )
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md"
                      >
                        {totalPages}
                      </button>
                    )
                  }
                  
                  return pages
                })()}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination?.totalPages || 0, currentPage + 1))}
                  disabled={currentPage === (pagination?.totalPages || 0)}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-white font-medium">Загрузка...</p>
          </div>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}

