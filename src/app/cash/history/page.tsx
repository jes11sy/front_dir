"use client"

import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient, CashTransaction } from '@/lib/api'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'

function HistoryContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyData, setHistoryData] = useState<CashTransaction[]>([])
  const [filteredData, setFilteredData] = useState<CashTransaction[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const itemsPerPage = 10

  // Данные для выпадающих списков
  const typeOptions = [
    { value: 'all', label: 'Все типы' },
    { value: 'приход', label: 'Приход' },
    { value: 'расход', label: 'Расход' }
  ]

  const cityOptions = [
    { value: 'all', label: 'Все города' },
    { value: 'Москва', label: 'Москва' },
    { value: 'СПб', label: 'СПб' },
    { value: 'Казань', label: 'Казань' },
    { value: 'Саратов', label: 'Саратов' },
    { value: 'Энгельс', label: 'Энгельс' }
  ]

  // Загрузка данных
  const loadHistoryData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCashTransactions()
      const safeData = Array.isArray(data) ? data : []
      setHistoryData(safeData)
      setFilteredData(safeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistoryData()
  }, [])

  // Фильтрация данных
  useEffect(() => {
    let filtered = [...historyData]

    // Фильтр по типу
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.name === typeFilter)
    }

    // Фильтр по городу
    if (cityFilter !== 'all') {
      filtered = filtered.filter(item => item.city === cityFilter)
    }

    // Фильтр по дате
    if (startDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.dateCreate)
        const start = new Date(startDate)
        return itemDate >= start
      })
    }

    if (endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.dateCreate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Включаем весь день
        return itemDate <= end
      })
    }

    setFilteredData(filtered)
    setCurrentPage(1) // Сбрасываем на первую страницу при изменении фильтров
  }, [historyData, typeFilter, cityFilter, startDate, endDate])

  // Вычисляем данные для текущей страницы
  const safeFilteredData = Array.isArray(filteredData) ? filteredData : []
  const totalPages = Math.ceil(safeFilteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = safeFilteredData.slice(startIndex, endIndex)

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

  // Подсчет статистики
  const totalIncome = filteredData
    .filter(item => item.name === 'приход')
    .reduce((sum, item) => sum + Number(item.amount), 0)
  
  const totalExpense = filteredData
    .filter(item => item.name === 'расход')
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const balance = totalIncome - totalExpense

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
              <div className="text-center py-8">
                <div className="text-white">Загрузка...</div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="text-red-400">Ошибка: {error}</div>
                <button 
                  onClick={loadHistoryData}
                  className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Фильтры */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white font-semibold">Фильтры</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  {showFilters ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    {/* Тип транзакции */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Тип</label>
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
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Город</label>
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
                      <label className="block text-xs text-gray-300 mb-1">От даты</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm w-full"
                        style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                        onFocus={(e) => e.target.style.borderColor = '#2a6b68'}
                        onBlur={(e) => e.target.style.borderColor = '#334155'}
                      />
                    </div>

                    {/* До даты */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">До даты</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm w-full"
                        style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                        onFocus={(e) => e.target.style.borderColor = '#2a6b68'}
                        onBlur={(e) => e.target.style.borderColor = '#334155'}
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
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
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
                <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Тип</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Назначение платежа</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Сумма</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Комментарий</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Дата</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Создатель</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Документ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case 'приход': return '#14b8a6'
                          case 'расход': return '#ef4444'
                          default: return '#6b7280'
                        }
                      }
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-teal-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                          <td className="py-4 px-4 text-gray-800 font-medium">{item.id}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-800">{item.city || 'Москва'}</td>
                          <td className="py-4 px-4 text-gray-800">{item.paymentPurpose || '-'}</td>
                          <td className={`py-4 px-4 text-gray-800 font-semibold ${item.name === 'приход' ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(item.amount).toLocaleString()} ₽
                          </td>
                          <td className="py-4 px-4 text-gray-800">{item.note || '-'}</td>
                          <td className="py-4 px-4 text-gray-800">{formatDate(item.dateCreate)}</td>
                          <td className="py-4 px-4 text-gray-800">{item.nameCreate}</td>
                          <td className="py-4 px-4 text-gray-800">
                            {item.receiptDoc ? (
                              <button className="text-blue-600 hover:text-blue-700 underline transition-colors">
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
              <div className="mt-6 flex justify-center items-center gap-2 flex-wrap animate-fade-in">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  ←
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      currentPage === page
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  →
                </button>
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
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  )
}
