"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, CashTransaction, CashStats } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import { X, Download, UploadCloud } from 'lucide-react'
import { useDesignStore } from '@/store/design.store'

function ExpenseContent() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expenseData, setExpenseData] = useState<CashTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  // 🔧 FIX: Сумма теперь приходит с сервера (агрегация через SQL)
  const [totalAmount, setTotalAmount] = useState(0)
  const itemsPerPage = 10
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [filterOpenSelect, setFilterOpenSelect] = useState<string | null>(null)

  // Состояние формы добавления расхода
  const [formData, setFormData] = useState({
    city: '',
    amount: '',
    purpose: '',
    comment: ''
  })
  
  // Хук для множественной загрузки чеков
  const {
    files: receiptFiles,
    dragOver,
    setDragOver,
    handleFiles: handleReceiptFiles,
    removeFile: removeReceiptFile,
    removeAllFiles: removeAllReceiptFiles,
    canAddMore: canAddMoreReceipts,
  } = useMultipleFileUpload(10) // Максимум 10 чеков
  
  // Состояние ошибки валидации чека
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Получаем города директора
  const currentUser = apiClient.getCurrentUser()
  const directorCities = currentUser?.cities || []
  // Стабильная строка для зависимости useMemo
  const directorCitiesKey = directorCities.join(',')
  
  // 🔧 FIX: Мемоизируем массивы чтобы избежать бесконечного цикла в useCallback
  const cities = useMemo(() => directorCities.map(city => ({
    value: city.toLowerCase().replace(/\s+/g, '_'),
    label: city
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [directorCitiesKey])

  const purposes = useMemo(() => [
    { value: 'avito', label: 'Авито' },
    { value: 'office', label: 'Офис' },
    { value: 'promoters', label: 'Промоутеры' },
    { value: 'leaflets', label: 'Листовки' },
    { value: 'collection', label: 'Инкасс' },
    { value: 'director_salary', label: 'Зарплата директора' },
    { value: 'other', label: 'Иное' }
  ], [])

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

  // Сброс всех фильтров (в drawer)
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
  const loadExpenseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 🔧 FIX: Преобразуем value фильтра города обратно в label для отправки на сервер
      const cityLabel = cityFilter ? cities.find(c => c.value === cityFilter)?.label : undefined
      // 🔧 FIX: Преобразуем value фильтра назначения обратно в label
      const purposeLabel = purposeFilter ? purposes.find(p => p.value === purposeFilter)?.label : undefined
      
      // Параметры фильтрации
      const filterParams = {
        city: cityLabel || undefined,
        paymentPurpose: purposeLabel || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      
      // 🔧 FIX: Два легких параллельных запроса вместо одного тяжелого с limit=10000
      const [transactionsResult, statsResult] = await Promise.all([
        // Запрос транзакций с серверной пагинацией
        apiClient.getCashTransactionsPaginated({
          page: currentPage,
          limit: itemsPerPage,
          type: 'расход',
          ...filterParams,
        }),
        // Запрос статистики (агрегация на сервере через SQL)
        apiClient.getCashStats({ type: 'расход', ...filterParams }),
      ])
      
      setExpenseData(transactionsResult.data)
      setTotalPages(transactionsResult.pagination.totalPages)
      // 🔧 FIX: Сумма считается на сервере - точно и быстро
      setTotalAmount(statsResult.totalExpense)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [currentPage, startDate, endDate, cityFilter, purposeFilter, cities, purposes])

  useEffect(() => {
    loadExpenseData()
  }, [loadExpenseData])

  // Функции для работы с формой (мемоизированные)
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Обработка drag-over для чеков
  const handleReceiptDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [setDragOver])

  const handleReceiptDragLeave = useCallback(() => {
    setDragOver(false)
  }, [setDragOver])

  const handleReceiptDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    
    if (e.dataTransfer.files && canAddMoreReceipts) {
      handleReceiptFiles(e.dataTransfer.files)
      setReceiptError(null)
    }
  }, [handleReceiptFiles, canAddMoreReceipts, setDragOver])

  const handleReceiptInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && canAddMoreReceipts) {
      handleReceiptFiles(e.target.files)
      setReceiptError(null)
    }
  }, [handleReceiptFiles, canAddMoreReceipts])

  const handleSubmit = async () => {
    // Валидация: чек обязателен для расхода
    if (receiptFiles.length === 0) {
      setReceiptError('Для проведения расхода необходимо прикрепить хотя бы один чек')
      return
    }
    
    setIsSubmitting(true)
    setReceiptError(null)
    
    try {
      const cityName = cities.find(c => c.value === formData.city)?.label || directorCities[0] || 'Москва'
      const purposeName = purposes.find(p => p.value === formData.purpose)?.label || 'Иное'
      
      // Загружаем все чеки в S3 параллельно
      const uploadPromises = receiptFiles
        .filter(f => f.file) // Только новые файлы (не существующие)
        .map(f => apiClient.uploadReceipt(f.file!, 'cash'))
      
      const uploadResults = await Promise.all(uploadPromises)
      const receiptDocs = uploadResults.map(r => r.filePath)
      
      await apiClient.createCashTransaction({
        name: 'расход',
        amount: Number(formData.amount),
        city: cityName,
        note: formData.comment,
        paymentPurpose: purposeName,
        receiptDocs: receiptDocs // Массив чеков
      })
      
      setShowAddModal(false)
      setFormData({ city: '', amount: '', purpose: '', comment: '' })
      removeAllReceiptFiles() // Очищаем загруженные файлы
      await loadExpenseData() // Перезагружаем данные
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания расхода')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🔧 FIX: Данные уже пагинированы с сервера - не нужна клиентская пагинация
  const currentData = expenseData

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8 animate-slide-in-left">
                <div className={`rounded-lg p-4 mb-6 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>Ошибка: {error}</p>
                  <button 
                    onClick={loadExpenseData}
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
                    className={`relative p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300 hover:text-red-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-600'}`}
                    title="Фильтры"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {/* Индикатор активных фильтров */}
                    {activeFiltersCount > 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 ${isDark ? 'border-[#2a3441]' : 'border-white'}`}></span>
                    )}
                  </button>

                  {/* Активные фильтры как теги */}
                  {activeFiltersCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {startDate && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          От: {new Date(startDate).toLocaleDateString('ru-RU')}
                          <button onClick={() => setStartDate('')} className={`ml-1 ${isDark ? 'hover:text-red-100' : 'hover:text-red-900'}`}>×</button>
                        </span>
                      )}
                      {endDate && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          До: {new Date(endDate).toLocaleDateString('ru-RU')}
                          <button onClick={() => setEndDate('')} className={`ml-1 ${isDark ? 'hover:text-red-100' : 'hover:text-red-900'}`}>×</button>
                        </span>
                      )}
                      {cityFilter && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {cities.find(c => c.value === cityFilter)?.label || cityFilter}
                          <button onClick={() => setCityFilter('')} className={`ml-1 ${isDark ? 'hover:text-red-100' : 'hover:text-red-900'}`}>×</button>
                        </span>
                      )}
                      {purposeFilter && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {purposes.find(p => p.value === purposeFilter)?.label || purposeFilter}
                          <button onClick={() => setPurposeFilter('')} className={`ml-1 ${isDark ? 'hover:text-red-100' : 'hover:text-red-900'}`}>×</button>
                        </span>
                      )}
                      <button
                        onClick={clearAllFilters}
                        className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                      >
                        Сбросить
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-red-500 hover:bg-red-600"
                >
                  + Добавить расход
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
                <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  {/* Header - только на десктопе */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                      title="Закрыть"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть - только на мобильных */}
                  <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Скрыть фильтры
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {/* Секция: Период */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {quickPeriods.map((period) => (
                          <button
                            key={period.label}
                            onClick={() => {
                              const { start, end } = period.getValue()
                              setDraftStartDate(start)
                              setDraftEndDate(end)
                            }}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-red-900/30 border-gray-600 hover:border-red-600 text-gray-300 hover:text-red-400' : 'bg-gray-50 hover:bg-red-50 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-700'}`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                          <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                          <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                          />
                        </div>
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Основные */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Основные</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
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
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Назначение</label>
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
                  <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
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
                <table className={`w-full border-collapse text-[11px] min-w-[600px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#ef4444'}}>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Назначение платежа</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сумма</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Комментарий</th>
                      <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата</th>
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
                        <tr 
                          key={item.id} 
                          className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-red-50 border-gray-200'}`}
                          onClick={() => router.push(`/cash/expense/view/${item.id}`)}
                        >
                          <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.id}</td>
                          <td className="py-3 px-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.city || directorCities[0] || 'Москва'}</td>
                          <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.paymentPurpose || '-'}</td>
                          <td className={`py-3 px-3 font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{Number(item.amount).toLocaleString()} ₽</td>
                          <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.note || '-'}</td>
                          <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(item.dateCreate)}</td>
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

      {/* Модальное окно добавления расхода */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-in-scale ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Добавить расход</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className={`text-2xl transition-colors duration-200 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Город */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Город</label>
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
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Сумма</label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Введите сумму"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:border-red-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'}`}
                />
              </div>

              {/* Назначение платежа */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Назначение платежа</label>
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
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Введите комментарий"
                  rows={3}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:border-red-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'}`}
                />
              </div>

              {/* Чеки (обязательно, множественная загрузка) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Чек <span className="text-red-500">*</span>
                  {receiptFiles.length > 0 && (
                    <span className={`font-normal ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({receiptFiles.length} файл(ов))</span>
                  )}
                </label>
                
                {receiptError && (
                  <div className={`mb-2 p-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    {receiptError}
                  </div>
                )}
                
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragOver
                      ? isDark ? 'border-teal-500 bg-teal-900/20' : 'border-teal-400 bg-teal-50'
                      : receiptFiles.length > 0
                        ? isDark ? 'border-green-600 bg-green-900/20' : 'border-green-400 bg-green-50'
                        : receiptError
                          ? isDark ? 'border-red-600 bg-red-900/20' : 'border-red-400 bg-red-50'
                          : isDark ? 'border-gray-600 bg-[#3a4451]' : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragOver={handleReceiptDragOver}
                  onDragLeave={handleReceiptDragLeave}
                  onDrop={handleReceiptDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={!canAddMoreReceipts}
                    onChange={handleReceiptInputChange}
                  />

                  {receiptFiles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {receiptFiles.map((fileWithPreview) => (
                          <div key={fileWithPreview.id} className="relative group">
                            {fileWithPreview.file?.type.startsWith('image/') ? (
                              <img
                                src={fileWithPreview.preview}
                                alt={fileWithPreview.file?.name || 'Чек'}
                                className="w-full h-16 object-cover rounded-lg shadow-sm"
                              />
                            ) : (
                              <div className={`w-full h-16 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <svg className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReceiptFile(fileWithPreview.id)
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
                              title="Удалить"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className={`text-xs text-center mt-1 truncate px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {fileWithPreview.file?.name || 'Файл'}
                            </div>
                          </div>
                        ))}
                      </div>
                      {canAddMoreReceipts && (
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нажмите или перетащите для добавления ещё файлов</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <UploadCloud className={`w-8 h-8 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {dragOver ? 'Отпустите файлы' : 'Перетащите чеки сюда'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>или нажмите для выбора (можно несколько)</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>PDF, JPG, PNG (макс. 10 файлов)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setReceiptError(null)
                  removeAllReceiptFiles()
                  setFormData({ city: '', amount: '', purpose: '', comment: '' })
                }}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md font-medium disabled:opacity-50 ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'}`}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || receiptFiles.length === 0}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium ${
                  receiptFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                } disabled:opacity-50`}
                title={receiptFiles.length === 0 ? 'Прикрепите хотя бы один чек' : ''}
              >
                {isSubmitting ? 'Загрузка...' : 'Добавить'}
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

export default function ExpensePage() {
  return <ExpenseContent />
}