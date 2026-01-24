"use client"

import { useState, useEffect, useCallback } from 'react'
import { apiClient, CashTransaction, CashStats } from '@/lib/api'
import { getSignedUrl } from '@/lib/s3-utils'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

function HistoryContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyData, setHistoryData] = useState<CashTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const itemsPerPage = 10

  // 🔧 FIX: Статистика теперь загружается с сервера (агрегация через SQL)
  const [stats, setStats] = useState<CashStats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeCount: 0,
    expenseCount: 0,
  })

  // Получаем города директора
  const currentUser = apiClient.getCurrentUser()
  const directorCities = currentUser?.cities || []

  // Данные для выпадающих списков
  const typeOptions = [
    { value: 'all', label: 'Все типы' },
    { value: 'приход', label: 'Приход' },
    { value: 'расход', label: 'Расход' }
  ]

  const cityOptions = [
    { value: 'all', label: 'Все города' },
    ...directorCities.map(city => ({
      value: city,
      label: city
    }))
  ]

  // 🔧 FIX: Загрузка данных с серверной пагинацией и статистикой
  const loadHistoryData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Параметры для запросов
      const filterParams = {
        city: cityFilter !== 'all' ? cityFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter as 'приход' | 'расход' : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      
      // 🔧 FIX: Два легких параллельных запроса вместо одного тяжелого с limit=10000
      const [transactionsResult, statsResult] = await Promise.all([
        // Запрос транзакций с серверной пагинацией
        apiClient.getCashTransactionsPaginated({
          page: currentPage,
          limit: itemsPerPage,
          ...filterParams,
        }),
        // Запрос статистики (агрегация на сервере через SQL)
        apiClient.getCashStats(filterParams),
      ])
      
      setHistoryData(transactionsResult.data)
      setTotalPages(transactionsResult.pagination.totalPages)
      setStats(statsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [currentPage, typeFilter, cityFilter, startDate, endDate])

  useEffect(() => {
    loadHistoryData()
  }, [loadHistoryData])

  // Сбрасываем на первую страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, cityFilter, startDate, endDate])

  // Форматирование даты
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

  // 🔧 FIX: Статистика теперь приходит с сервера
  const totalIncome = stats.totalIncome
  const totalExpense = stats.totalExpense
  const balance = stats.balance

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Статистика */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-left">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-sm text-gray-600 font-medium">Приходы</div>
                <div className="text-xl font-bold text-green-600">{totalIncome.toLocaleString()} ₽</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-sm text-gray-600 font-medium">Расходы</div>
                <div className="text-xl font-bold text-red-600">{totalExpense.toLocaleString()} ₽</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-sm text-gray-600 font-medium">Баланс</div>
                <div className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balance.toLocaleString()} ₽
                </div>
              </div>
            </div>

            {/* Состояние загрузки и ошибки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <div className="text-gray-700 text-lg mt-4">Загрузка...</div>
              </div>
            )}

            {error && (
              <div className="text-center py-8 animate-slide-in-left">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="text-red-600 text-lg mb-4">Ошибка: {error}</div>
                  <button 
                    onClick={loadHistoryData}
                    className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            )}

            {/* Фильтры */}
            <div className="mb-6">
              <div className="mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h3 className="text-gray-700 font-semibold group-hover:text-teal-600 transition-colors duration-200">
                    Фильтры
                  </h3>
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
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Тип транзакции */}
                    <div className="min-w-[140px] relative">
                      <label className="block text-xs text-gray-600 mb-1">Тип</label>
                      <CustomSelect
                        value={typeFilter}
                        onChange={setTypeFilter}
                        options={typeOptions}
                        placeholder="Выберите тип"
                        compact={true}
                        selectId="type"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>

                    {/* Город */}
                    <div className="min-w-[140px] relative">
                      <label className="block text-xs text-gray-600 mb-1">Город</label>
                      <CustomSelect
                        value={cityFilter}
                        onChange={setCityFilter}
                        options={cityOptions}
                        placeholder="Выберите город"
                        compact={true}
                        selectId="city"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>

                    {/* От даты */}
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">От даты</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>

                    {/* До даты */}
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">До даты</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setStartDate('')
                        setEndDate('')
                        setTypeFilter('all')
                        setCityFilter('all')
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                    >
                      Сбросить все
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Таблица */}
            {!loading && !error && (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
                <table className="w-full border-collapse text-[11px] min-w-[600px] bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Тип</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Назначение платежа</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Сумма</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Комментарий</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Дата</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Создатель</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Документ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 🔧 FIX: Данные уже пагинированы с сервера */}
                    {historyData.map((item) => {
                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case 'приход': return '#14b8a6'
                          case 'расход': return '#ef4444'
                          default: return '#6b7280'
                        }
                      }
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-teal-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                          <td className="py-3 px-3 text-gray-800 font-medium">{item.id}</td>
                          <td className="py-3 px-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-800">{item.city || 'Москва'}</td>
                          <td className="py-3 px-3 text-gray-800">{item.paymentPurpose || '-'}</td>
                          <td className={`py-3 px-3 text-gray-800 font-semibold ${item.name === 'приход' ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(item.amount).toLocaleString()} ₽
                          </td>
                          <td className="py-3 px-3 text-gray-800">{item.note || '-'}</td>
                          <td className="py-3 px-3 text-gray-800">{formatDate(item.dateCreate)}</td>
                          <td className="py-3 px-3 text-gray-800">{item.nameCreate}</td>
                          <td className="py-3 px-3 text-gray-800">
                            {item.receiptDoc ? (
                              <button 
                                className="text-blue-600 hover:text-blue-700 underline transition-colors"
                                onClick={async () => {
                                  try {
                                    const signedUrl = await getSignedUrl(item.receiptDoc!)
                                    window.open(signedUrl, '_blank')
                                  } catch (error) {
                                    console.error('Ошибка при скачивании документа:', error)
                                    alert('Не удалось скачать документ')
                                  }
                                }}
                              >
                                Скачать
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Пагинация */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  maxVisiblePages={7}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Стили для кастомного скроллбара */}
      <style jsx global>{`
        /* Custom scroll for dropdown */
        .custom-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .custom-dropdown::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb {
          background: #2a6b68;
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb:hover {
          background: #1a5a57;
        }
      `}</style>
    </div>
  )
}

export default function HistoryPage() {
  return <HistoryContent />
}
