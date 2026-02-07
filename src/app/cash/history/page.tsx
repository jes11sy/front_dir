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
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyData, setHistoryData] = useState<CashTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [filterOpenSelect, setFilterOpenSelect] = useState<string | null>(null)
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
    { value: '', label: 'Все типы' },
    { value: 'приход', label: 'Приход' },
    { value: 'расход', label: 'Расход' }
  ]

  const cityOptions = [
    { value: '', label: 'Все города' },
    ...directorCities.map(city => ({
      value: city,
      label: city
    }))
  ]

  // Быстрые периоды для фильтра
  const quickPeriods = [
    { label: 'Сегодня', getValue: () => {
      const today = new Date().toISOString().split('T')[0]
      return { start: today, end: today }
    }},
    { label: 'Вчера', getValue: () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      return { start: yesterday, end: yesterday }
    }},
    { label: 'Неделя', getValue: () => {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      return { start, end }
    }},
    { label: 'Месяц', getValue: () => {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      return { start, end }
    }},
  ]

  // Подсчёт активных фильтров
  const activeFiltersCount = [startDate, endDate, typeFilter, cityFilter].filter(Boolean).length

  // Сброс всех фильтров
  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setTypeFilter('')
    setCityFilter('')
  }

  // Применить фильтры и закрыть drawer
  const applyFilters = () => {
    setCurrentPage(1)
    setShowFilterDrawer(false)
    loadHistoryData()
  }

  // 🔧 FIX: Загрузка данных с серверной пагинацией и статистикой
  const loadHistoryData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Параметры для запросов
      const filterParams = {
        city: cityFilter || undefined,
        type: typeFilter ? typeFilter as 'приход' | 'расход' : undefined,
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
    <div>
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

            {/* Заголовок и кнопка фильтров */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Иконка фильтров */}
                <button
                  onClick={() => setShowFilterDrawer(true)}
                  className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-teal-600 transition-all duration-200"
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {/* Активные фильтры как теги */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {startDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        От: {new Date(startDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => setStartDate('')} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => setEndDate('')} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    {typeFilter && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        {typeOptions.find(t => t.value === typeFilter)?.label || typeFilter}
                        <button onClick={() => setTypeFilter('')} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        {cityFilter}
                        <button onClick={() => setCityFilter('')} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    <button
                      onClick={resetFilters}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      Сбросить
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Drawer для фильтров */}
            {showFilterDrawer && (
              <>
                {/* Overlay */}
                <div 
                  className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
                  onClick={() => setShowFilterDrawer(false)}
                />
                
                {/* Drawer */}
                <div className="fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-gray-800">Фильтры</h2>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {/* Секция: Период */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Период</h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {quickPeriods.map((period) => (
                          <button
                            key={period.label}
                            onClick={() => {
                              const { start, end } = period.getValue()
                              setStartDate(start)
                              setEndDate(end)
                            }}
                            className="px-3 py-2 bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded-lg text-sm font-medium text-gray-700 hover:text-teal-700 transition-all duration-200"
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">С</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">По</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Секция: Основные */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Основные</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                        <CustomSelect
                          value={typeFilter}
                          onChange={(value) => setTypeFilter(value)}
                          options={typeOptions}
                          placeholder="Выберите тип"
                          selectId="filter-type"
                          openSelect={filterOpenSelect}
                          setOpenSelect={setFilterOpenSelect}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                        <CustomSelect
                          value={cityFilter}
                          onChange={(value) => setCityFilter(value)}
                          options={cityOptions}
                          placeholder="Выберите город"
                          selectId="filter-city"
                          openSelect={filterOpenSelect}
                          setOpenSelect={setFilterOpenSelect}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
                    <button
                      onClick={resetFilters}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </>
            )}

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
          />
        </div>
      )}

      {/* Стили для кастомного скроллбара и анимаций */}
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
        
        /* Slide-in animation for drawer */
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default function HistoryPage() {
  return <HistoryContent />
}
