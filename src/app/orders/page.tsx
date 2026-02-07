"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { apiClient, Order } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useDesignStore } from '@/store/design.store'

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'orders_scroll_position'

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
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

  // Черновые состояния для панели фильтров (применяются только по кнопке)
  const [draftSearchId, setDraftSearchId] = useState('')
  const [draftSearchPhone, setDraftSearchPhone] = useState('')
  const [draftSearchAddress, setDraftSearchAddress] = useState('')
  const [draftStatusFilter, setDraftStatusFilter] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftMasterFilter, setDraftMasterFilter] = useState('')
  const [draftRkFilter, setDraftRkFilter] = useState('')
  const [draftTypeEquipmentFilter, setDraftTypeEquipmentFilter] = useState('')
  const [draftDateType, setDraftDateType] = useState<'create' | 'close' | 'meeting'>('create')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')

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

  // Открытие панели фильтров — копируем текущие значения в черновик
  const openFiltersPanel = () => {
    setDraftSearchId(searchId)
    setDraftSearchPhone(searchPhone)
    setDraftSearchAddress(searchAddress)
    setDraftStatusFilter(statusFilter)
    setDraftCityFilter(cityFilter)
    setDraftMasterFilter(masterFilter)
    setDraftRkFilter(rkFilter)
    setDraftTypeEquipmentFilter(typeEquipmentFilter)
    setDraftDateType(dateType)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setShowFilters(true)
  }

  // Применение фильтров — копируем черновик в основные состояния
  const applyFilters = () => {
    setSearchId(draftSearchId)
    setSearchPhone(draftSearchPhone)
    setSearchAddress(draftSearchAddress)
    setStatusFilter(draftStatusFilter)
    setCityFilter(draftCityFilter)
    setMasterFilter(draftMasterFilter)
    setRkFilter(draftRkFilter)
    setTypeEquipmentFilter(draftTypeEquipmentFilter)
    setDateType(draftDateType)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setCurrentPage(1)
    setShowFilters(false)
  }

  // Сброс фильтров — очищаем и черновик, и основные
  const resetFilters = () => {
    // Сбрасываем черновик
    setDraftSearchId('')
    setDraftSearchPhone('')
    setDraftSearchAddress('')
    setDraftStatusFilter('')
    setDraftCityFilter('')
    setDraftMasterFilter('')
    setDraftRkFilter('')
    setDraftTypeEquipmentFilter('')
    setDraftDateType('create')
    setDraftDateFrom('')
    setDraftDateTo('')
    // Сбрасываем основные фильтры
    setSearchTerm('')
    setSearchId('')
    setSearchPhone('')
    setSearchAddress('')
    setStatusFilter('')
    setCityFilter('')
    setMasterFilter('')
    setRkFilter('')
    setTypeEquipmentFilter('')
    setDateType('create')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
    setShowFilters(false)
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

  // Функция для получения стилей статуса (пастельные бейджи)
  const getStatusStyle = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'Готово': return 'bg-green-900/40 text-green-400'
        case 'В работе': return 'bg-blue-900/40 text-blue-400'
        case 'Ожидает': return 'bg-amber-900/40 text-amber-400'
        case 'Отказ': return 'bg-red-900/40 text-red-400'
        case 'Принял': return 'bg-emerald-900/40 text-emerald-400'
        case 'В пути': return 'bg-violet-900/40 text-violet-400'
        case 'Модерн': return 'bg-orange-900/40 text-orange-400'
        case 'Незаказ': return 'bg-gray-700/40 text-gray-400'
        default: return 'bg-gray-700/40 text-gray-400'
      }
    }
    switch (status) {
      case 'Готово': return 'bg-green-100 text-green-700'
      case 'В работе': return 'bg-blue-100 text-blue-700'
      case 'Ожидает': return 'bg-amber-100 text-amber-700'
      case 'Отказ': return 'bg-red-100 text-red-700'
      case 'Принял': return 'bg-emerald-100 text-emerald-700'
      case 'В пути': return 'bg-violet-100 text-violet-700'
      case 'Модерн': return 'bg-orange-100 text-orange-700'
      case 'Незаказ': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // Функция для получения стилей типа заказа (пастельные бейджи)
  const getTypeStyle = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'Впервые': return 'bg-emerald-900/40 text-emerald-400'
        case 'Повтор': return 'bg-amber-900/40 text-amber-400'
        case 'Гарантия': return 'bg-red-900/40 text-red-400'
        default: return 'bg-gray-700/40 text-gray-400'
      }
    }
    switch (type) {
      case 'Впервые': return 'bg-emerald-100 text-emerald-700'
      case 'Повтор': return 'bg-amber-100 text-amber-700'
      case 'Гарантия': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#1e2530]' : 'bg-white'
    }`}>
      <div className="px-4 py-6">
        <div className="w-full">
          <div className={`transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
            

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className={`rounded-lg p-4 mb-6 animate-slide-in-left ${
                isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Табы статусов + иконка фильтров */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center gap-2">
                {/* Табы с прокруткой */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className={`flex gap-1 p-1 rounded-lg w-max ${
                    isDark ? 'bg-[#2a3441]' : 'bg-gray-100'
                  }`}>
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
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                          statusTab === tab.id
                            ? isDark 
                              ? 'bg-[#3a4451] text-teal-400 shadow-sm'
                              : 'bg-white text-teal-600 shadow-sm'
                            : isDark
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Иконка фильтров */}
                <button
                  onClick={openFiltersPanel}
                  className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                    isDark 
                      ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'
                  }`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {(searchId || searchPhone || searchAddress || statusFilter || cityFilter || masterFilter || rkFilter || typeEquipmentFilter || dateFrom || dateTo) && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                      isDark ? 'border-[#1e2530]' : 'border-white'
                    }`}></span>
                  )}
                </button>
              </div>
            </div>

            {/* Выезжающая панель фильтров справа */}
            {showFilters && (
              <>
                {/* Затемнение фона */}
                <div 
                  className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                    isDark ? 'bg-black/50' : 'bg-black/30'
                  }`}
                  onClick={() => setShowFilters(false)}
                />
                
                {/* Панель фильтров */}
                <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
                  isDark ? 'bg-[#2a3441]' : 'bg-white'
                }`}>
                  {/* Заголовок панели - только на десктопе */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Закрыть"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть - только на мобильных */}
                  <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Скрыть фильтры
                    </button>
                  </div>

                  {/* Содержимое фильтров */}
                  <div className="p-4 space-y-4">
                    {/* Секция: Поиск */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>№ заказа</label>
                        <input
                          type="text"
                          value={draftSearchId}
                          onChange={(e) => setDraftSearchId(e.target.value)}
                          placeholder="ID заказа..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Телефон</label>
                        <input
                          type="text"
                          value={draftSearchPhone}
                          onChange={(e) => setDraftSearchPhone(e.target.value)}
                          placeholder="Номер телефона..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</label>
                        <input
                          type="text"
                          value={draftSearchAddress}
                          onChange={(e) => setDraftSearchAddress(e.target.value)}
                          placeholder="Адрес..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Основные фильтры */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Основные</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
                        <Select value={draftStatusFilter || "all"} onValueChange={(value) => setDraftStatusFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все статусы" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все статусы</SelectItem>
                            {Array.isArray(allStatuses) && allStatuses.map(status => (
                              <SelectItem key={status} value={status} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                        <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все города" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все города</SelectItem>
                            {Array.isArray(allCities) && allCities.map(city => (
                              <SelectItem key={city} value={city} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Мастер</label>
                        <Select value={draftMasterFilter || "all"} onValueChange={(value) => setDraftMasterFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все мастера" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все мастера</SelectItem>
                            {Array.isArray(allMasters) && allMasters.map(master => (
                              <SelectItem key={master.id} value={master.id.toString()} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{master.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Дополнительные */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дополнительно</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>РК</label>
                        <Select value={draftRkFilter || "all"} onValueChange={(value) => setDraftRkFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все РК" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все РК</SelectItem>
                            {Array.isArray(allRks) && allRks.map(rk => (
                              <SelectItem key={rk} value={rk} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{rk}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Направление</label>
                        <Select value={draftTypeEquipmentFilter || "all"} onValueChange={(value) => setDraftTypeEquipmentFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все направления" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все направления</SelectItem>
                            {Array.isArray(allTypeEquipments) && allTypeEquipments.map(type => (
                              <SelectItem key={type} value={type} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Даты */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Тип даты</label>
                        <Select value={draftDateType} onValueChange={(value: 'create' | 'close' | 'meeting') => setDraftDateType(value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Тип даты" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="create" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата создания</SelectItem>
                            <SelectItem value="close" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата закрытия</SelectItem>
                            <SelectItem value="meeting" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата встречи</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                          <input
                            type="date"
                            value={draftDateFrom}
                            onChange={(e) => setDraftDateFrom(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                              isDark 
                                ? 'bg-[#3a4451] border-gray-600 text-gray-100'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                          <input
                            type="date"
                            value={draftDateTo}
                            onChange={(e) => setDraftDateTo(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                              isDark 
                                ? 'bg-[#3a4451] border-gray-600 text-gray-100'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Нижняя панель с кнопками */}
                  <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        isDark 
                          ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Десктопная таблица */}
            {!loading && !error && safeOrders.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет заказов для отображения</p>
              </div>
            )}
            
            {!loading && !error && safeOrders.length > 0 && (
            <div className="hidden md:block animate-fade-in">
              <table className={`w-full border-collapse text-xs rounded-lg shadow-lg ${
                isDark ? 'bg-[#2a3441]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-teal-600' : 'bg-gray-50 border-teal-500'}`}>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип заказа</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Имя мастера</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Телефон</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Адрес</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата встречи</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Направление</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Проблема</th>
                    <th className={`text-center py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(safeOrders) && safeOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className={`border-b transition-colors cursor-pointer ${
                        isDark 
                          ? 'border-gray-700 hover:bg-[#3a4451]'
                          : 'border-gray-200 hover:bg-teal-50'
                      }`}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.id}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.rk}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.city}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.avitoName || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.phone}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.clientName}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.address}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(order.dateMeeting)}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.typeEquipment}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.problem}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.statusOrder)}`}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.master?.name || '-'}</td>
                      <td className={`py-2 px-2 font-semibold ${isDark ? 'text-teal-400' : 'text-gray-800'}`}>
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
            <div className="md:hidden space-y-3 animate-fade-in">
              {Array.isArray(safeOrders) && safeOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    isDark 
                      ? 'bg-[#2a3441] border-gray-700 hover:border-teal-600'
                      : 'bg-white border-gray-200 hover:border-teal-300'
                  }`}
                  onClick={() => handleOrderClick(order.id)}
                >
                  {/* Верхняя строка: ID, тип, дата */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(order.dateMeeting)}</span>
                  </div>
                  
                  {/* Основной контент */}
                  <div className="px-3 py-2.5">
                    {/* Клиент и город */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || 'Без имени'}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{order.city}</span>
                    </div>
                    
                    {/* Адрес */}
                    <p className={`text-xs mb-2 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.address || '—'}</p>
                    
                    {/* Проблема */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <span className={`text-xs shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.typeEquipment}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>·</span>
                      <span className={`text-xs line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.problem || '—'}</span>
                    </div>
                  </div>
                  
                  {/* Нижняя строка: мастер, статус, сумма */}
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.master?.name || 'Не назначен'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.statusOrder)}`}>
                        {order.statusOrder}
                      </span>
                      {order.result && typeof order.result === 'number' && (
                        <span className={`font-bold text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                          {order.result.toLocaleString()} ₽
                        </span>
                      )}
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

