"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient, Order, OrdersResponse, OrdersStats } from '@/lib/api'
import { logger } from '@/lib/logger'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'

function OrdersContent() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [masterFilter, setMasterFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [openSelect, setOpenSelect] = useState<string | null>(null)

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>([])
  const [allMasters, setAllMasters] = useState<{id: number, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Загрузка данных
  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [response, statuses, masters] = await Promise.all([
        apiClient.getOrders({
          page: currentPage,
          limit: itemsPerPage,
          status: statusFilter || undefined,
          city: cityFilter || undefined,
          search: searchTerm || undefined,
          master: masterFilter || undefined,
        }),
        apiClient.getOrderStatuses().catch(() => ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ']),
        apiClient.getMasters().catch(() => [])
      ])
      
      console.log('Orders response:', response)
      console.log('Orders data:', response.data?.orders)
      setOrders(Array.isArray(response.data?.orders) ? response.data.orders : [])
      setAllStatuses(Array.isArray(statuses) ? statuses : ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
      setAllMasters(Array.isArray(masters) ? masters : [])
      setPagination(response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заказов')
      logger.error('Error loading orders', err)
    } finally {
      setLoading(false)
    }
  }


  // Загружаем данные при изменении фильтров
  useEffect(() => {
    loadOrders()
  }, [currentPage, statusFilter, cityFilter, searchTerm, masterFilter])


  // Обработчики фильтров
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Сбрасываем на первую страницу при поиске
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

  // Получаем уникальные значения для фильтров из загруженных данных
  const safeOrders = Array.isArray(orders) ? orders : []
  console.log('Orders state:', orders)
  console.log('Safe orders:', safeOrders)
  const uniqueCities = Array.from(new Set(safeOrders.map(order => order.city)))

  // Сброс фильтров
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCityFilter('')
    setMasterFilter('')
    setCurrentPage(1)
  }

  const handleOrderClick = (orderId: number) => {
    router.push(`/orders/${orderId}`)
  }

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-4 md:p-12 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Фильтр</h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  {showFilters ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4 animate-slide-in-right">
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
                      <CustomSelect
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={[
                          { value: '', label: 'Все статусы' },
                          ...(Array.isArray(allStatuses) ? allStatuses : []).map(status => ({ value: status, label: status }))
                        ]}
                        placeholder="Все статусы"
                        compact={true}
                        selectId="status"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Город */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Город
                      </label>
                      <CustomSelect
                        value={cityFilter}
                        onChange={handleCityChange}
                        options={[
                          { value: '', label: 'Все города' },
                          ...(Array.isArray(uniqueCities) ? uniqueCities : []).map(city => ({ value: city, label: city }))
                        ]}
                        placeholder="Все города"
                        compact={true}
                        selectId="city"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
                    
                    {/* Мастер */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Мастер
                      </label>
                      <CustomSelect
                        value={masterFilter}
                        onChange={handleMasterChange}
                        options={[
                          { value: '', label: 'Все мастера' },
                          ...(Array.isArray(allMasters) ? allMasters : []).map(master => ({ value: master.id.toString(), label: master.name }))
                        ]}
                        placeholder="Все мастера"
                        compact={true}
                        selectId="master"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
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
            <div className="hidden md:block overflow-x-auto animate-fade-in">
              <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                <thead>
                  <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Тип заказа</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">РК</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Город</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Имя мастера</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Телефон</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Клиент</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Адрес</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Дата встречи</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Направление</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Проблема</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Статус</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Мастер</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Итог</th>
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
                      <td className="py-4 px-4 text-gray-800 font-medium">{order.id}</td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-800">{order.rk}</td>
                      <td className="py-4 px-4 text-gray-800">{order.city}</td>
                      <td className="py-4 px-4 text-gray-800">{order.avitoName || '-'}</td>
                      <td className="py-4 px-4 text-gray-800">{order.phone}</td>
                      <td className="py-4 px-4 text-gray-800">{order.clientName}</td>
                      <td className="py-4 px-4 text-gray-800">{order.address}</td>
                      <td className="py-4 px-4 text-gray-800">{formatDate(order.dateMeeting)}</td>
                      <td className="py-4 px-4 text-gray-800">{order.typeEquipment}</td>
                      <td className="py-4 px-4 text-gray-800">{order.problem}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-800">{order.master?.name || '-'}</td>
                      <td className="py-4 px-4 text-gray-800 font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</td>
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
                    <span className="text-gray-800 font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</span>
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
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-1 sm:gap-2 flex-wrap animate-fade-in">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-300 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  ←
                </button>
                
                {(() => {
                  const maxVisiblePages = 5 // Уменьшил количество видимых страниц для мобильных
                  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  const endPage = Math.min(pagination?.totalPages || 0, startPage + maxVisiblePages - 1)
                  const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1)
                  
                  const pages = []
                  
                  // Показываем первую страницу и многоточие если нужно
                  if (adjustedStartPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                      >
                        1
                      </button>
                    )
                    if (adjustedStartPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500 text-sm">
                          ...
                        </span>
                      )
                    }
                  }
                  
                  // Показываем видимые страницы
                  for (let page = adjustedStartPage; page <= endPage; page++) {
                    pages.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                            : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white hover:shadow-md'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  }
                  
                  // Показываем многоточие и последнюю страницу если нужно
                  if (endPage < (pagination?.totalPages || 0)) {
                    if (endPage < (pagination?.totalPages || 0) - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">
                          ...
                        </span>
                      )
                    }
                    pages.push(
                      <button
                        key={pagination?.totalPages || 0}
                        onClick={() => setCurrentPage(pagination?.totalPages || 0)}
                        className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                      >
                        {pagination?.totalPages || 0}
                      </button>
                    )
                  }
                  
                  return pages
                })()}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination?.totalPages || 0, currentPage + 1))}
                  disabled={currentPage === (pagination?.totalPages || 0)}
                  className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-300 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
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
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  )
}
