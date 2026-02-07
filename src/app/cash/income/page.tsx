"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, CashTransaction, CashStats } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

function IncomeContent() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [incomeData, setIncomeData] = useState<CashTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  // 🔧 FIX: Сумма теперь приходит с сервера (агрегация через SQL)
  const [totalAmount, setTotalAmount] = useState(0)
  const itemsPerPage = 10
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [filterOpenSelect, setFilterOpenSelect] = useState<string | null>(null)

  // Состояние формы добавления прихода
  const [formData, setFormData] = useState({
    city: '',
    amount: '',
    purpose: '',
    comment: '',
    receipt: null as File | null
  })

  // Данные для выпадающих списков
  const currentUser = apiClient.getCurrentUser()
  const directorCities = currentUser?.cities || []
  
  const cities = directorCities.map(city => ({
    value: city.toLowerCase().replace(/\s+/g, '_'),
    label: city
  }))

  const purposes = [
    { value: 'order', label: 'Заказ' },
    { value: 'deposit', label: 'Депозит' },
    { value: 'fine', label: 'Штраф' },
    { value: 'other', label: 'Иное' }
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
  const activeFiltersCount = [startDate, endDate, cityFilter, purposeFilter].filter(Boolean).length

  // Сброс всех фильтров (в drawer и основных)
  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftCityFilter('')
    setDraftPurposeFilter('')
  }

  // Применить фильтры из черновика и закрыть drawer
  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setCityFilter(draftCityFilter)
    setPurposeFilter(draftPurposeFilter)
    setCurrentPage(1)
    setShowFilterDrawer(false)
  }

  // Сброс основных фильтров (при клике на теги)
  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setCityFilter('')
    setPurposeFilter('')
    setCurrentPage(1)
  }

  // Состояния для "черновых" фильтров в drawer
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftPurposeFilter, setDraftPurposeFilter] = useState('')

  // Открытие drawer - копируем текущие фильтры в черновик
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftCityFilter(cityFilter)
    setDraftPurposeFilter(purposeFilter)
    setShowFilterDrawer(true)
  }

  // 🔧 FIX: Загрузка данных с серверной пагинацией и агрегацией
  const loadIncomeData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Параметры фильтрации
      const filterParams = {
        city: cityFilter || undefined,
        paymentPurpose: purposeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      
      // 🔧 FIX: Два легких параллельных запроса вместо одного тяжелого с limit=10000
      const [transactionsResult, statsResult] = await Promise.all([
        // Запрос транзакций с серверной пагинацией
        apiClient.getCashTransactionsPaginated({
          page: currentPage,
          limit: itemsPerPage,
          type: 'приход',
          ...filterParams,
        }),
        // Запрос статистики (агрегация на сервере через SQL)
        apiClient.getCashStats({ type: 'приход', ...filterParams }),
      ])
      
      setIncomeData(transactionsResult.data)
      setTotalPages(transactionsResult.pagination.totalPages)
      // 🔧 FIX: Сумма считается на сервере - точно и быстро
      setTotalAmount(statsResult.totalIncome)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [currentPage, startDate, endDate, cityFilter, purposeFilter])

  useEffect(() => {
    loadIncomeData()
  }, [loadIncomeData])

  // Функции для работы с формой (мемоизированные)
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleFileChange = useCallback((file: File | null) => {
    setFormData(prev => ({ ...prev, receipt: file }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileChange(files[0])
    }
  }, [handleFileChange])

  const handleSubmit = async () => {
    try {
      const cityName = cities.find(c => c.value === formData.city)?.label || directorCities[0] || 'Москва'
      const purposeName = purposes.find(p => p.value === formData.purpose)?.label || 'Иное'
      
      let receiptDoc = null
      
      // Загружаем файл в S3, если он есть
      if (formData.receipt) {
        const uploadResult = await apiClient.uploadReceipt(formData.receipt, 'cash')
        receiptDoc = uploadResult.filePath
      }
      
      await apiClient.createCashTransaction({
        name: 'приход',
        amount: Number(formData.amount),
        city: cityName,
        note: formData.comment,
        paymentPurpose: purposeName,
        receiptDoc: receiptDoc || undefined
      })
      
      setShowAddModal(false)
      setFormData({ city: '', amount: '', purpose: '', comment: '', receipt: null })
      await loadIncomeData() // Перезагружаем данные
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания прихода')
    }
  }

  // 🔧 FIX: Данные уже пагинированы с сервера - не нужна клиентская пагинация
  const currentData = incomeData

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
  return (
    <div>
      {/* Состояние загрузки и ошибки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8 animate-slide-in-left">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600 font-medium">Ошибка: {error}</p>
                  <button 
                    onClick={loadIncomeData}
                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            )}

            {/* Заголовок и кнопки */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Иконка фильтров */}
                  <button
                    onClick={openFilterDrawer}
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
                      {cityFilter && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                          {cities.find(c => c.value === cityFilter)?.label || cityFilter}
                          <button onClick={() => setCityFilter('')} className="hover:text-teal-900 ml-1">×</button>
                        </span>
                      )}
                      {purposeFilter && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                          {purposes.find(p => p.value === purposeFilter)?.label || purposeFilter}
                          <button onClick={() => setPurposeFilter('')} className="hover:text-teal-900 ml-1">×</button>
                        </span>
                      )}
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Сбросить
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  + Добавить приход
                </button>
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
                <div className="fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-gray-800">Фильтры</h2>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Закрыть"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть для мобильной версии */}
                  <div className="md:hidden px-4 pt-3">
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Скрыть
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
                              setDraftStartDate(start)
                              setDraftEndDate(end)
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
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">По</label>
                          <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                        <CustomSelect
                          value={draftCityFilter}
                          onChange={(value) => setDraftCityFilter(value)}
                          options={[{ value: '', label: 'Все города' }, ...cities]}
                          placeholder="Выберите город"
                          selectId="filter-city"
                          openSelect={filterOpenSelect}
                          setOpenSelect={setFilterOpenSelect}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Назначение</label>
                        <CustomSelect
                          value={draftPurposeFilter}
                          onChange={(value) => setDraftPurposeFilter(value)}
                          options={[{ value: '', label: 'Все назначения' }, ...purposes]}
                          placeholder="Выберите назначение"
                          selectId="filter-purpose"
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
                {currentData.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Нет приходов</h3>
                    <p className="text-gray-500 mb-4">Приходы по вашим городам не найдены</p>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
                    >
                      Добавить первый приход
                    </button>
                  </div>
                ) : (
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
                      </tr>
                    </thead>
                    <tbody>
                      {/* 🔧 FIX: Данные уже отфильтрованы на сервере */}
                      {currentData.map((item) => {
                        const getTypeColor = (type: string) => {
                          switch (type) {
                            case 'приход': return '#14b8a6'
                            case 'расход': return '#ef4444'
                            default: return '#6b7280'
                          }
                        }
                        
                        return (
                          <tr 
                            key={item.id} 
                            className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                            style={{borderColor: '#e5e7eb'}}
                            onClick={() => router.push(`/cash/income/view/${item.id}`)}
                          >
                            <td className="py-3 px-3 text-gray-800 font-medium">{item.id}</td>
                            <td className="py-3 px-3">
                              <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                                {item.name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-800">{item.city || directorCities[0] || 'Москва'}</td>
                            <td className="py-3 px-3 text-gray-800">{item.paymentPurpose || '-'}</td>
                            <td className="py-3 px-3 text-gray-800 font-semibold text-green-600">{Number(item.amount).toLocaleString()} ₽</td>
                            <td className="py-3 px-3 text-gray-800">{item.note || '-'}</td>
                            <td className="py-3 px-3 text-gray-800">{formatDate(item.dateCreate)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
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

      {/* Модальное окно добавления прихода */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-in-scale">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Добавить приход</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors duration-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Город */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Город</label>
                <CustomSelect
                  value={formData.city}
                  onChange={(value) => handleInputChange('city', value)}
                  options={cities}
                  placeholder="Выберите город"
                  selectId="city"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                />
              </div>

              {/* Сумма */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Сумма</label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Введите сумму"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Назначение платежа */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Назначение платежа</label>
                <CustomSelect
                  value={formData.purpose}
                  onChange={(value) => handleInputChange('purpose', value)}
                  options={purposes}
                  placeholder="Выберите назначение"
                  selectId="purpose"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                />
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Введите комментарий"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Чек */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Чек</label>
                <div className="relative">
                  <input
                    type="file"
                    id="receipt-upload"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2a6b68'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#4b5563'}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {formData.receipt ? (
                      <div className="flex flex-col items-center">
                        {formData.receipt.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(formData.receipt)}
                            alt="Предпросмотр"
                            className="w-16 h-16 object-cover rounded border border-gray-600 mb-2"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-600 rounded border border-gray-500 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <p className="text-xs text-green-400 font-medium">{formData.receipt.name}</p>
                        <p className="text-xs text-gray-500">Нажмите для изменения</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-400 text-center">
                          <span className="font-medium" style={{color: '#2a6b68'}}>Перетащите файл сюда</span>
                        </p>
                        <p className="text-xs text-gray-500">или нажмите для выбора</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
              >
                Добавить
              </button>
            </div>
          </div>
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
      `}</style>
    </div>
  )
}

export default function IncomePage() {
  return <IncomeContent />
}
