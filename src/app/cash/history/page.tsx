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
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Статистика */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300">Приходы</div>
                <div className="text-xl font-bold text-green-400">{totalIncome.toLocaleString()} ₽</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300">Расходы</div>
                <div className="text-xl font-bold text-red-400">{totalExpense.toLocaleString()} ₽</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300">Баланс</div>
                <div className={`text-xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full border-collapse text-[11px] min-w-[600px]">
                  <thead>
                    <tr className="border-b-2" style={{borderColor: '#114643'}}>
                      <th className="text-left py-2 px-2 font-semibold text-white">ID</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Тип</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Город</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Назначение платежа</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Сумма</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Комментарий</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Дата</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Создатель</th>
                      <th className="text-left py-2 px-2 font-semibold text-white">Документ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case 'приход': return '#2a6b68'
                          case 'расход': return '#ef4444'
                          default: return '#6b7280'
                        }
                      }
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-white/10 transition-colors" style={{borderColor: '#114643'}}>
                          <td className="py-2 px-2 text-white">{item.id}</td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-1 rounded-full text-[11px] font-medium text-white" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-white">{item.city || 'Москва'}</td>
                          <td className="py-2 px-2 text-white">{item.paymentPurpose || '-'}</td>
                          <td className={`py-2 px-2 text-white font-semibold ${item.name === 'приход' ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(item.amount).toLocaleString()} ₽
                          </td>
                          <td className="py-2 px-2 text-white">{item.note || '-'}</td>
                          <td className="py-2 px-2 text-white">{formatDate(item.dateCreate)}</td>
                          <td className="py-2 px-2 text-white">{item.nameCreate}</td>
                          <td className="py-2 px-2 text-white">
                            {item.receiptDoc ? (
                              <button className="text-blue-400 hover:text-blue-300 underline">
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
              <div className="mt-6 flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors text-xs sm:text-sm"
                >
                  ←
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 sm:px-3 rounded-lg transition-colors text-xs sm:text-sm text-white ${
                      currentPage === page
                        ? ''
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    style={{
                      backgroundColor: currentPage === page ? '#2a6b68' : undefined
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage === page) {
                        e.currentTarget.style.backgroundColor = '#1a5a57'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage === page) {
                        e.currentTarget.style.backgroundColor = '#2a6b68'
                      }
                    }}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors text-xs sm:text-sm"
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
