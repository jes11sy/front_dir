"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { apiClient, Order } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

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
  // Отдельные поля поиска
  const [searchId, setSearchId] = useState(() => searchParams.get('searchId') || '')
  const [searchPhone, setSearchPhone] = useState(() => searchParams.get('searchPhone') || '')
  const [searchAddress, setSearchAddress] = useState(() => searchParams.get('searchAddress') || '')
  
  // Табы статусов: all, Ожидает, Принял, В работе, completed (Готово+Отказ+Незаказ)
  const [statusTab, setStatusTab] = useState<string>(() => searchParams.get('tab') || 'all')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') || '')
  const [masterFilter, setMasterFilter] = useState(() => searchParams.get('master') || '')
  const [showFilters, setShowFilters] = useState(() => {
    // Показываем фильтры если есть активные фильтры в URL
    return !!(searchParams.get('status') || searchParams.get('city') || searchParams.get('master') || 
              searchParams.get('rk') || searchParams.get('typeEquipment') || 
              searchParams.get('dateFrom') || searchParams.get('dateTo') ||
              searchParams.get('searchId') || searchParams.get('searchPhone') || searchParams.get('searchAddress'))
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
  const [allCities, setAllCities] = useState<string[]>([]) // Города пользователя (фиксированный список)
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
  
  // Определяем тип навигации: back/forward vs reload/direct
  const isBackNavigation = useRef(false)
  
  // При монтировании проверяем тип навигации и загружаем города пользователя
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Проверяем тип навигации
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'
      
      // Если это reload или прямой переход - очищаем сохранённую позицию
      if (navigationType === 'reload' || navigationType === 'navigate') {
        sessionStorage.removeItem(SCROLL_POSITION_KEY)
        isBackNavigation.current = false
      } else if (navigationType === 'back_forward') {
        // Если это back/forward - разрешаем восстановление позиции
        isBackNavigation.current = true
      }
      
      // Загружаем города пользователя из профиля (фиксированный список)
      const user = apiClient.getCurrentUser()
      if (user?.cities && Array.isArray(user.cities)) {
        setAllCities(user.cities)
      }
    }
  }, [])

  // Обновление URL с текущими фильтрами (без перезагрузки страницы)
  const updateUrlWithFilters = useCallback(() => {
    const params = new URLSearchParams()
    
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (statusTab !== 'all') params.set('tab', statusTab)
    if (searchId) params.set('searchId', searchId)
    if (searchPhone) params.set('searchPhone', searchPhone)
    if (searchAddress) params.set('searchAddress', searchAddress)
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
  }, [currentPage, statusTab, searchId, searchPhone, searchAddress, statusFilter, cityFilter, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Сохранение позиции прокрутки перед переходом на страницу заказа
  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString())
    }
  }, [])

  // Восстановление позиции прокрутки при возврате (только для back/forward навигации)
  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && !hasRestoredScroll.current && isBackNavigation.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedPosition) {
        // Небольшая задержка чтобы DOM успел отрендериться
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10))
          hasRestoredScroll.current = true
          // Очищаем после восстановления
          sessionStorage.removeItem(SCROLL_POSITION_KEY)
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
      
      // Определяем статус на основе таба
      let effectiveStatus = statusFilter?.trim() || undefined
      if (!effectiveStatus && statusTab !== 'all') {
        if (statusTab === 'completed') {
          // Завершённые: Готово, Отказ, Незаказ
          effectiveStatus = 'Готово,Отказ,Незаказ'
        } else {
          // Конкретный статус
          effectiveStatus = statusTab
        }
      }
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: effectiveStatus,
        city: cityFilter?.trim() || undefined,
        searchId: searchId?.trim() || undefined,
        searchPhone: searchPhone?.trim() || undefined,
        searchAddress: searchAddress?.trim() || undefined,
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
  }, [currentPage, itemsPerPage, statusTab, statusFilter, cityFilter, searchId, searchPhone, searchAddress, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Загружаем данные при изменении фильтров
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
  }, [currentPage, statusTab, statusFilter, cityFilter, masterFilter, itemsPerPage, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo, searchId, searchPhone, searchAddress])

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

  // Обработчик смены таба статусов
  const handleStatusTabChange = (tab: string) => {
    setStatusTab(tab)
    setStatusFilter('') // Сбрасываем фильтр статуса при смене таба
    setCurrentPage(1)
  }

  // Обработчики фильтров поиска
  const handleSearchIdChange = (value: string) => {
    setSearchId(value)
    setCurrentPage(1)
  }
  
  const handleSearchPhoneChange = (value: string) => {
    setSearchPhone(value)
    setCurrentPage(1)
  }
  
  const handleSearchAddressChange = (value: string) => {
    setSearchAddress(value)
    setCurrentPage(1)
  }

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
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6">
        <div className="w-full">
          <div className="bg-white">
            

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

            {/* Табы статусов */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'Ожидает', label: 'Ожидает' },
                  { id: 'Принял', label: 'Принял' },
                  { id: 'В работе', label: 'В работе' },
                  { id: 'Модерн', label: 'Модерн' },
                  { id: 'completed', label: 'Завершённые' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleStatusTabChange(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      statusTab === tab.id
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Фильтры */}
            <div className="mb-6 animate-slide-in-left">
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтры
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
                  {/* Первая строка: Поиск по ID, Телефону, Адресу */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Поиск по ID */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        № заказа
                      </label>
                      <input
                        type="text"
                        value={searchId}
                        onChange={(e) => handleSearchIdChange(e.target.value)}
                        placeholder="ID заказа..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Поиск по телефону */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Телефон
                      </label>
                      <input
                        type="text"
                        value={searchPhone}
                        onChange={(e) => handleSearchPhoneChange(e.target.value)}
                        placeholder="Номер телефона..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Поиск по адресу */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Адрес
                      </label>
                      <input
                        type="text"
                        value={searchAddress}
                        onChange={(e) => handleSearchAddressChange(e.target.value)}
                        placeholder="Адрес..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                  
                  {/* Вторая строка: Статус, Город, Мастер */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          {Array.isArray(allCities) && allCities.map(city => (
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
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={pagination?.totalPages || 0}
                  onPageChange={setCurrentPage}
                />
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
    <Suspense fallback={<LoadingScreen message="Загрузка заказов" />}>
      <OrdersContent />
    </Suspense>
  )
}

