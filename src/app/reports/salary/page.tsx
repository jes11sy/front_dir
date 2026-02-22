"use client"

import { useState, useEffect } from 'react'
import { apiClient, CityReport, CashTransaction } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

const RATE = 0.07

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().split('T')[0]
}

function getSunday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day))
  return d.toISOString().split('T')[0]
}

function calcSalary(reports: CityReport[]) {
  return reports.reduce((s, r) => s + (r.orders?.totalClean ?? 0) * RATE, 0)
}

function SalaryReportContent() {
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'

  // Основные фильтры
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  // Черновые фильтры (в drawer)
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')

  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [filterOpenSelect, setFilterOpenSelect] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cityReports, setCityReports] = useState<CityReport[]>([])

  // Блоки статистики
  const [prevWeekSalary, setPrevWeekSalary] = useState<number | null>(null)
  const [curWeekSalary, setCurWeekSalary] = useState<number | null>(null)
  const [curMonthSalary, setCurMonthSalary] = useState<number | null>(null)

  // История выплат
  const [history, setHistory] = useState<CashTransaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const userCities = user?.cities || []
  const cityOptions = userCities.map(city => ({ value: city, label: city }))

  const quickPeriods = [
    {
      label: 'День',
      getValue: () => {
        const d = new Date().toISOString().split('T')[0]
        return { start: d, end: d }
      },
    },
    {
      label: 'Неделя',
      getValue: () => {
        const now = new Date()
        return { start: getMonday(now), end: getSunday(now) }
      },
    },
    {
      label: 'Месяц',
      getValue: () => {
        const now = new Date()
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        }
      },
    },
  ]

  const activeFiltersCount = [startDate, endDate, cityFilter].filter(Boolean).length

  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftCityFilter(cityFilter)
    setShowFilterDrawer(true)
  }

  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftCityFilter('')
  }

  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setCityFilter(draftCityFilter)
    setShowFilterDrawer(false)

    const filters: { startDate?: string; endDate?: string } = {}
    if (draftStartDate) filters.startDate = draftStartDate
    if (draftEndDate) filters.endDate = draftEndDate
    if (!draftStartDate && !draftEndDate) {
      const now = new Date()
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    }
    loadReport(filters)
  }

  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setCityFilter('')
    const now = new Date()
    loadReport({ startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] })
  }

  const loadReport = async (filters?: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCityReport({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      })
      setCityReports(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const loadStatBlocks = async () => {
    const now = new Date()

    // Прошлая неделя
    const prevMon = new Date(now)
    prevMon.setDate(now.getDate() - 7)
    const prevWeekStart = getMonday(prevMon)
    const prevWeekEnd = getSunday(prevMon)

    // Текущая неделя
    const curWeekStart = getMonday(now)
    const curWeekEnd = getSunday(now)

    // Текущий месяц
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [prevWeek, curWeek, curMonth] = await Promise.allSettled([
      apiClient.getCityReport({ startDate: prevWeekStart, endDate: prevWeekEnd }),
      apiClient.getCityReport({ startDate: curWeekStart, endDate: curWeekEnd }),
      apiClient.getCityReport({ startDate: curMonthStart, endDate: curMonthEnd }),
    ])

    setPrevWeekSalary(prevWeek.status === 'fulfilled' ? calcSalary(prevWeek.value) : 0)
    setCurWeekSalary(curWeek.status === 'fulfilled' ? calcSalary(curWeek.value) : 0)
    setCurMonthSalary(curMonth.status === 'fulfilled' ? calcSalary(curMonth.value) : 0)
  }

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const res = await apiClient.getCashTransactionsPaginated({
        type: 'расход',
        paymentPurpose: 'Зарплата директора',
        limit: 50,
      })
      setHistory(res.data || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    const now = new Date()
    loadReport({ startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] })
    loadStatBlocks()
    loadHistory()
  }, [])

  const formatNumber = (num: number) => new Intl.NumberFormat('ru-RU').format(Math.round(num))

  const formatDate = (str: string) =>
    new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const rows = cityReports
    .filter(r => !cityFilter || r.city === cityFilter)
    .map(r => ({
      city: r.city,
      name: user?.name ?? '—',
      turnover: r.orders?.totalClean ?? 0,
      salary: (r.orders?.totalClean ?? 0) * RATE,
    }))
    .sort((a, b) => b.salary - a.salary)

  return (
    <div>
      {/* Блок начислений */}
      <div className={`rounded-xl border mb-8 overflow-hidden ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDark ? 'border-gray-700 bg-[#3a4451]' : 'border-gray-100 bg-gray-50'}`}>
          <svg className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Начисления</span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
          {[
            { label: 'Начислено за пред. неделю', value: prevWeekSalary },
            { label: 'Начислено за тек. неделю', value: curWeekSalary },
            { label: 'Начислено за месяц', value: curMonthSalary },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-5">
              <div className={`text-xs font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
              {value === null ? (
                <div className="h-8 w-28 rounded-lg animate-pulse bg-gray-300/20" />
              ) : (
                <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatNumber(value)} ₽
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-xl mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка отчета...</div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="text-center py-8 animate-slide-in-left">
          <div className={`rounded-lg p-6 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <div className={`text-xl mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Ошибка: {error}</div>
            <button
              onClick={() => loadReport()}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Панель управления */}
          <div className="mb-6">
            <div className="flex items-center justify-between animate-slide-in-left">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={openFilterDrawer}
                  className={`relative p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300 hover:text-teal-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'}`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeFiltersCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#2a3441]' : 'border-white'}`}></span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {startDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        От: {new Date(startDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setStartDate(''); loadReport({ endDate: endDate || undefined }) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadReport({ startDate: startDate || undefined }) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {cityFilter}
                        <button onClick={() => setCityFilter('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    <button onClick={clearAllFilters} className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
                      Сбросить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Drawer */}
          {showFilterDrawer && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300" onClick={() => setShowFilterDrawer(false)} />
              <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                  <button onClick={() => setShowFilterDrawer(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`} title="Закрыть">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button onClick={() => setShowFilterDrawer(false)} className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Скрыть фильтры
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {quickPeriods.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => { const { start, end } = p.getValue(); setDraftStartDate(start); setDraftEndDate(end) }}
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                        <input type="date" value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`} />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                        <input type="date" value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`} />
                      </div>
                    </div>
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                    <CustomSelect
                      value={draftCityFilter}
                      onChange={(value) => setDraftCityFilter(value)}
                      options={[{ value: '', label: 'Все города' }, ...cityOptions]}
                      placeholder="Выберите город"
                      selectId="filter-city-salary"
                      openSelect={filterOpenSelect}
                      setOpenSelect={setFilterOpenSelect}
                    />
                  </div>
                </div>

                <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button onClick={resetFilters} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    Сбросить
                  </button>
                  <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Применить
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Таблица */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
            <div className="min-w-[480px]">
              <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#14b8a6' }}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ФИО</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.city} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{row.city}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{row.name}</td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{formatNumber(row.turnover)} ₽</td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatNumber(row.salary)} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="text-center py-8">
              <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет данных для отображения</p>
            </div>
          )}

          {/* История выплат */}
          <div className="mt-10">
            <div className={`border-t mb-8 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
            <div className={`flex items-center gap-3 mb-4`}>
              <h2 className={`text-base font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                История списаний зарплаты
              </h2>
              {!historyLoading && history.length > 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-[#3a4451] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {history.length}
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="min-w-[400px]">
                  <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#14b8a6' }}>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата</th>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Примечание</th>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((tx) => (
                        <tr key={tx.id} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}>
                          <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(tx.dateCreate || tx.createdAt)}</td>
                          <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{tx.city || '—'}</td>
                          <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.note || '—'}</td>
                          <td className={`py-3 px-4 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatNumber(tx.amount)} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!historyLoading && history.length > 0 && (
              <div className={`mt-3 flex justify-end`}>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-[#3a4451] text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  Итого выплачено:&nbsp;{formatNumber(history.reduce((s, t) => s + t.amount, 0))} ₽
                </div>
              </div>
            )}

            {!historyLoading && history.length === 0 && (
              <div className={`text-center py-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Выплаты не найдены
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function SalaryReportPage() {
  return <SalaryReportContent />
}
