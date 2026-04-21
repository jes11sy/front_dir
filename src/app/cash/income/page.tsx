"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowUpFromLine, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiClient, CashTransaction, CashStats } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { NetworkError } from '@/components/ui/network-error'
import { LoadingState } from '@/components/ui/loading-state'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

function IncomeContent() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
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

  // Получаем города директора из Zustand store
  const directorCities = user?.cities || []
  // Стабильная строка для зависимости useMemo
  const directorCitiesKey = directorCities.join(',')
  
  // 🔧 FIX: Мемоизируем массивы чтобы избежать бесконечного цикла в useCallback
  const cities = useMemo(() => directorCities.map(city => ({
    value: city.toLowerCase().replace(/\s+/g, '_'),
    label: city
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [directorCitiesKey])

  const purposes = useMemo(() => [
    { value: 'order', label: 'Заказ' },
    { value: 'deposit', label: 'Депозит' },
    { value: 'fine', label: 'Штраф' },
    { value: 'other', label: 'Иное' }
  ], [])

  const toLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Быстрые периоды для фильтра
  const quickPeriods = [
    { label: 'Сегодня', getValue: () => {
      const today = toLocalDate(new Date())
      return { start: today, end: today }
    }},
    { label: 'Вчера', getValue: () => {
      const yesterday = toLocalDate(new Date(Date.now() - 86400000))
      return { start: yesterday, end: yesterday }
    }},
    { label: 'Неделя', getValue: () => {
      const end = toLocalDate(new Date())
      const start = toLocalDate(new Date(Date.now() - 7 * 86400000))
      return { start, end }
    }},
    { label: 'Месяц', getValue: () => {
      const end = toLocalDate(new Date())
      const start = toLocalDate(new Date(Date.now() - 30 * 86400000))
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
  }, [currentPage, startDate, endDate, cityFilter, purposeFilter, cities, purposes])

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

  if (error) {
    return (
      <div className="min-h-[60vh]">
        <NetworkError
          isDark={isDark}
          onRetry={loadIncomeData}
          message={error !== 'Ошибка загрузки данных' ? error : undefined}
        />
      </div>
    )
  }

  return (
    <div>
            {/* Заголовок и кнопки */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center justify-between gap-4">
                {/* Активные фильтры как теги */}
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  {activeFiltersCount > 0 && (
                    <>
                      {startDate && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`}>
                          От: {new Date(startDate).toLocaleDateString('ru-RU')}
                          <button onClick={() => setStartDate('')} className={`ml-1 ${isDark ? 'hover:text-white/60' : 'hover:text-black/60'}`}>×</button>
                        </span>
                      )}
                      {endDate && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`}>
                          До: {new Date(endDate).toLocaleDateString('ru-RU')}
                          <button onClick={() => setEndDate('')} className={`ml-1 ${isDark ? 'hover:text-white/60' : 'hover:text-black/60'}`}>×</button>
                        </span>
                      )}
                      {cityFilter && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`}>
                          {cities.find(c => c.value === cityFilter)?.label || cityFilter}
                          <button onClick={() => setCityFilter('')} className={`ml-1 ${isDark ? 'hover:text-white/60' : 'hover:text-black/60'}`}>×</button>
                        </span>
                      )}
                      {purposeFilter && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`}>
                          {purposes.find(p => p.value === purposeFilter)?.label || purposeFilter}
                          <button onClick={() => setPurposeFilter('')} className={`ml-1 ${isDark ? 'hover:text-white/60' : 'hover:text-black/60'}`}>×</button>
                        </span>
                      )}
                      <button
                        onClick={clearAllFilters}
                        className={`text-xs transition-colors whitespace-nowrap ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                      >
                        Сбросить
                      </button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className={`px-4 py-2 rounded-2xl transition-all duration-200 hover:-translate-y-[1px] text-sm font-medium ${
                      isDark 
                        ? 'bg-white text-[#111113] hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                        : 'bg-[#0a4f42] text-white hover:bg-[#083f35] shadow-md shadow-[#0a4f42]/20'
                    }`}
                  >
                    + Добавить приход
                  </button>

                  {/* Иконка фильтров */}
                  <button
                    onClick={openFilterDrawer}
                    className={`relative flex items-center justify-center min-h-[40px] w-[40px] flex-shrink-0 rounded-2xl transition-all duration-200 bg-transparent ${
                      isDark 
                        ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' 
                        : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                    }`}
                    title="Фильтры"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {/* Индикатор активных фильтров */}
                    {activeFiltersCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
                    )}
                  </button>
                </div>
              </div>
            </div>

      {/* Состояние загрузки и ошибки */}
            {loading && <LoadingState isDark={isDark} />}

            {error && (
              <NetworkError 
                isDark={isDark} 
                onRetry={loadIncomeData} 
                message={error !== 'Ошибка загрузки данных' ? error : undefined} 
              />
            )}

            {/* Sidebar Drawer для фильтров */}
            <>
              {/* Overlay */}
              <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                  showFilterDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                } ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
                onClick={() => setShowFilterDrawer(false)}
              />
              
              {/* Drawer */}
              <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                showFilterDrawer ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
              } ${
                isDark 
                  ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]' 
                  : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
              }`}>
                  {/* Header - только на десктопе */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                      title="Скрыть фильтры"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка скрыть - только на мобильных */}
                  <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                        isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
                      }`}
                    >
                      Скрыть фильтры
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-8">
                    {/* Секция: Период */}
                    <div className="space-y-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/55'}`}>Период</h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {quickPeriods.map((period) => (
                          (() => {
                            const { start, end } = period.getValue()
                            const isSelected = draftStartDate === start && draftEndDate === end

                            return (
                              <button
                                key={period.label}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setDraftStartDate('')
                                    setDraftEndDate('')
                                  } else {
                                    setDraftStartDate(start)
                                    setDraftEndDate(end)
                                  }
                                }}
                                className={`min-h-[44px] px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 shadow-sm ${
                                  isSelected
                                    ? 'bg-[#0a4f42] text-white shadow-md shadow-[#0a4f42]/20'
                                    : isDark
                                      ? 'bg-white/[0.04] hover:bg-white/10 text-white'
                                      : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                                }`}
                              >
                                {period.label}
                              </button>
                            )
                          })()
                        ))}
                      </div>
                      
                      <DateRangePicker
                        startDate={draftStartDate}
                        endDate={draftEndDate}
                        onChange={(start, end) => {
                          setDraftStartDate(start)
                          setDraftEndDate(end)
                        }}
                        isDark={isDark}
                      />
                    </div>

                    <hr className={isDark ? 'border-white/10' : 'border-black/[0.06]'} />

                    {/* Секция: Основные */}
                    <div className="space-y-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/55'}`}>Основные</h3>
                      
                      <div className="space-y-3">
                        <CustomSelect
                          value={draftCityFilter}
                          onChange={(value) => setDraftCityFilter(value)}
                          options={[{ value: '', label: 'Все города' }, ...cities]}
                          placeholder="Выберите город"
                          selectId="filter-city"
                          openSelect={filterOpenSelect}
                          setOpenSelect={setFilterOpenSelect}
                          className={`w-full min-h-[44px] rounded-2xl text-[15px] shadow-sm ${isDark ? 'bg-white/[0.04] text-white' : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'}`}
                        />

                        <CustomSelect
                          value={draftPurposeFilter}
                          onChange={(value) => setDraftPurposeFilter(value)}
                          options={[{ value: '', label: 'Все назначения' }, ...purposes]}
                          placeholder="Выберите назначение"
                          selectId="filter-purpose"
                          openSelect={filterOpenSelect}
                          setOpenSelect={setFilterOpenSelect}
                          className={`w-full min-h-[44px] rounded-2xl text-[15px] shadow-sm ${isDark ? 'bg-white/[0.04] text-white' : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                        isDark 
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' 
                          : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                        isDark 
                          ? 'bg-white hover:bg-gray-200 text-[#111113]' 
                          : 'bg-[#0a4f42] hover:bg-[#083f35] text-white shadow-md shadow-[#0a4f42]/20'
                      }`}
                    >
                      Применить
                    </button>
                  </div>
              </div>
            </>

            {/* Таблица */}
            {!loading && !error && (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
                {currentData.length === 0 ? (
                  <div className={`text-center py-12 rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-[#3a4451]' : 'bg-gray-100'}`}>
                      <svg className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Нет приходов</h3>
                    <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Приходы по вашим городам не найдены</p>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className={`px-4 py-2 mt-4 rounded-2xl transition-all duration-200 hover:-translate-y-[1px] text-sm font-medium ${
                        isDark 
                          ? 'bg-white text-[#111113] hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                          : 'bg-[#0a4f42] text-white hover:bg-[#083f35] shadow-md shadow-[#0a4f42]/20'
                      }`}
                    >
                      Добавить первый приход
                    </button>
                  </div>
                ) : (
                  <table className={`w-full border-collapse text-xs min-w-[600px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Назначение платежа</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сумма</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Комментарий</th>
                        <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 🔧 FIX: Данные уже отфильтрованы на сервере */}
                      {currentData.map((item) => {
                        const getTypeStyle = (type: string) => {
                          if (isDark) {
                            switch (type) {
                              case 'приход': return 'bg-emerald-700 text-white'
                              case 'расход': return 'bg-red-700 text-white'
                              default: return 'bg-gray-600 text-white'
                            }
                          }
                          switch (type) {
                            case 'приход': return 'bg-emerald-600 text-white'
                            case 'расход': return 'bg-red-600 text-white'
                            default: return 'bg-gray-500 text-white'
                          }
                        }
                        
                        return (
                          <tr 
                            key={item.id} 
                            className={`border-b transition-colors cursor-pointer ${
                              isDark 
                                ? 'border-white/10 hover:bg-white/[0.04]'
                                : 'border-black/10 hover:bg-black/[0.02]'
                            }`}
                            onClick={() => router.push(`/cash/income/view/${item.id}`)}
                          >
                            <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(item.name)}`}>
                                {item.name}
                              </span>
                            </td>
                            <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.city || directorCities[0] || 'Москва'}</td>
                            <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.paymentPurpose || '-'}</td>
                            <td className={`py-2 px-2 font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`}>
                              {Number(item.amount).toLocaleString()} ₽
                            </td>
                            <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.note || '-'}</td>
                            <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(item.createdAt)}</td>
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
        <div className="fixed inset-0 z-50 animate-fade-in flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className={`relative w-full max-w-md rounded-[30px] p-6 shadow-2xl animate-fade-in-scale ${
            isDark ? 'bg-[#111113]/92 backdrop-blur-xl border border-white/10' : 'bg-white/92 backdrop-blur-xl border border-black/[0.06]'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#111113]'}`}>Добавить приход</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-white/[0.04] text-white/60 hover:text-white' : 'hover:bg-black/[0.035] text-black/60 hover:text-black'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Город */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Город</label>
                <CustomSelect
                  value={formData.city}
                  onChange={(value) => handleInputChange('city', value)}
                  options={cities}
                  placeholder="Выберите город"
                  selectId="city"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                  className={`w-full min-h-[44px] rounded-2xl text-[15px] border-0 shadow-sm ${isDark ? 'bg-white/[0.04] text-white' : 'bg-white text-[#111113]'}`}
                />
              </div>

              {/* Сумма */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Сумма</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Введите сумму"
                  className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 transition-all border-0 shadow-sm ${
                    isDark 
                      ? 'bg-white/[0.04] text-white placeholder-white/30'
                      : 'bg-white text-[#111113] placeholder-black/30'
                  }`}
                />
              </div>

              {/* Назначение платежа */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Назначение платежа</label>
                <CustomSelect
                  value={formData.purpose}
                  onChange={(value) => handleInputChange('purpose', value)}
                  options={purposes}
                  placeholder="Выберите назначение"
                  selectId="purpose"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                  className={`w-full min-h-[44px] rounded-2xl text-[15px] border-0 shadow-sm ${isDark ? 'bg-white/[0.04] text-white' : 'bg-white text-[#111113]'}`}
                />
              </div>

              {/* Комментарий */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Введите комментарий"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 transition-all border-0 shadow-sm ${
                    isDark 
                      ? 'bg-white/[0.04] text-white placeholder-white/30'
                      : 'bg-white text-[#111113] placeholder-black/30'
                  }`}
                />
              </div>

              {/* Чек */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Чек</label>
                <div
                  className={`relative border-2 border-dashed rounded-2xl transition-colors ${
                    isDark ? 'border-white/10 hover:border-white/20' : 'border-black/10 hover:border-black/20'
                  } ${formData.receipt ? 'p-2' : 'p-6'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {!formData.receipt && (
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  )}
                  {formData.receipt ? (
                    <div className="relative group">
                      {formData.receipt.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(formData.receipt)}
                          alt="Предпросмотр"
                          className="w-full max-h-40 object-contain rounded-xl cursor-pointer"
                          onClick={() => window.open(URL.createObjectURL(formData.receipt!), '_blank')}
                        />
                      ) : (
                        <div className={`w-full h-20 rounded-xl flex items-center justify-center gap-2 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                          <ArrowUpFromLine className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm truncate max-w-[200px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formData.receipt.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all duration-150" />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleFileChange(null); }}
                          className="w-8 h-8 bg-white/90 hover:bg-white text-gray-700 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                          title="Удалить"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <ArrowUpFromLine className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-black/60'}`} />
                      </div>
                      <span className={`text-[15px] font-medium ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                        Нажмите или перетащите файл
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                  isDark 
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' 
                    : 'bg-black/[0.035] hover:bg-black/[0.06] text-[#111113]'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                  isDark 
                    ? 'bg-white hover:bg-gray-200 text-[#111113]' 
                    : 'bg-[#0a4f42] hover:bg-[#083f35] text-white shadow-md shadow-[#0a4f42]/20'
                }`}
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
          background: transparent;
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.3);
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb:hover {
          background: rgba(150, 150, 150, 0.5);
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
