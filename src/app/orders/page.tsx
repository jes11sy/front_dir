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
      
      setOrders(response.data)
      setAllStatuses(statuses)
      setAllMasters(masters)
      setPagination(response.pagination)
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
  const uniqueCities = Array.from(new Set(orders.map(order => order.city)))

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
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-4 md:p-12 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Фильтры */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Фильтр</h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1.5 text-white rounded transition-colors text-sm"
                  style={{backgroundColor: '#2a6b68'}}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                >
                  {showFilters ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Поиск */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Поиск (№, телефон, адрес)
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Введите номер, телефон или адрес..."
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none transition-colors"
                        onFocus={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.borderColor = '#4b5563'}
                      />
                    </div>
                    
                    {/* Статус */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Статус
                      </label>
                      <CustomSelect
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={[
                          { value: '', label: 'Все статусы' },
                          ...allStatuses.map(status => ({ value: status, label: status }))
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
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Город
                      </label>
                      <CustomSelect
                        value={cityFilter}
                        onChange={handleCityChange}
                        options={[
                          { value: '', label: 'Все города' },
                          ...uniqueCities.map(city => ({ value: city, label: city }))
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
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Мастер
                      </label>
                      <CustomSelect
                        value={masterFilter}
                        onChange={handleMasterChange}
                        options={[
                          { value: '', label: 'Все мастера' },
                          ...allMasters.map(master => ({ value: master.id.toString(), label: master.name }))
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
                      className="px-3 py-1.5 text-white rounded transition-colors text-sm"
                      style={{backgroundColor: '#2a6b68'}}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                    >
                      Сбросить
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Десктопная таблица */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2" style={{borderColor: '#114643'}}>
                    <th className="text-left py-2 px-2 font-semibold text-white">ID</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Тип заказа</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">РК</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Город</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Имя мастера</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Телефон</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Клиент</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Адрес</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Дата встречи</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Направление</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Проблема</th>
                    <th className="text-center py-2 px-2 font-semibold text-white">Статус</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Мастер</th>
                    <th className="text-left py-2 px-2 font-semibold text-white">Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr 
                      key={order.id}
                      className="border-b hover:bg-white/10 transition-colors cursor-pointer" 
                      style={{borderColor: '#114643'}}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className="py-2 px-2 text-white">{order.id}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded-full text-[11px] font-medium text-white" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-white">{order.rk}</td>
                      <td className="py-2 px-2 text-white">{order.city}</td>
                      <td className="py-2 px-2 text-white">{order.avitoName || '-'}</td>
                      <td className="py-2 px-2 text-white">{order.phone}</td>
                      <td className="py-2 px-2 text-white">{order.clientName}</td>
                      <td className="py-2 px-2 text-white">{order.address}</td>
                      <td className="py-2 px-2 text-white">{formatDate(order.dateMeeting)}</td>
                      <td className="py-2 px-2 text-white">{order.typeEquipment}</td>
                      <td className="py-2 px-2 text-white">{order.problem}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block px-2 py-1 rounded-full text-[11px] font-medium text-white" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                          {order.statusOrder}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-white">{order.master?.name || '-'}</td>
                      <td className="py-2 px-2 text-white font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильные карточки */}
            <div className="md:hidden space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">#{order.id}</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className="text-white font-semibold">{order.result ? `${order.result.toLocaleString()} ₽` : '-'}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Клиент:</span>
                      <span className="text-white">{order.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Город:</span>
                      <span className="text-white">{order.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Мастер:</span>
                      <span className="text-white">{order.master?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Проблема:</span>
                      <span className="text-white">{order.problem}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Статус:</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                        {order.statusOrder}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Пагинация */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors text-xs sm:text-sm"
                >
                  ←
                </button>
                
                {(() => {
                  const maxVisiblePages = 5 // Уменьшил количество видимых страниц для мобильных
                  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)
                  const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1)
                  
                  const pages = []
                  
                  // Показываем первую страницу и многоточие если нужно
                  if (adjustedStartPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-xs sm:text-sm"
                      >
                        1
                      </button>
                    )
                    if (adjustedStartPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">
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
                        className={`px-2 py-1 sm:px-3 rounded transition-colors text-xs sm:text-sm ${
                          currentPage === page
                            ? 'text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                        style={currentPage === page ? {backgroundColor: '#2a6b68'} : {}}
                        onMouseEnter={currentPage !== page ? (e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57' : undefined}
                        onMouseLeave={currentPage !== page ? (e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68' : undefined}
                      >
                        {page}
                      </button>
                    )
                  }
                  
                  // Показываем многоточие и последнюю страницу если нужно
                  if (endPage < pagination.totalPages) {
                    if (endPage < pagination.totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">
                          ...
                        </span>
                      )
                    }
                    pages.push(
                      <button
                        key={pagination.totalPages}
                        onClick={() => setCurrentPage(pagination.totalPages)}
                        className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-xs sm:text-sm"
                      >
                        {pagination.totalPages}
                      </button>
                    )
                  }
                  
                  return pages
                })()}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors text-xs sm:text-sm"
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
