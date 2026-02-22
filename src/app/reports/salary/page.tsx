"use client"

import { useState, useEffect } from 'react'
import { apiClient, CityReport } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

const DIRECTOR_SALARY_RATE = 0.07

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

function getFirstDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
}

function getLastDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
}

function SalaryReportContent() {
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'

  const now = new Date()
  const [startDate, setStartDate] = useState(getFirstDay(now))
  const [endDate, setEndDate] = useState(getLastDay(now))
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('month')
  const [cityFilter, setCityFilter] = useState('')
  const [openSelect, setOpenSelect] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cityReports, setCityReports] = useState<CityReport[]>([])

  const userCities = user?.cities || []
  const cityOptions = [
    { value: '', label: 'Все города' },
    ...userCities.map(c => ({ value: c, label: c })),
  ]

  const loadReport = async (start: string, end: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCityReport({
        startDate: start || undefined,
        endDate: end || undefined,
      })
      setCityReports(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(getFirstDay(new Date()), getLastDay(new Date()))
  }, [])

  const selectPeriod = (period: 'day' | 'week' | 'month') => {
    const today = new Date()
    const today_str = today.toISOString().split('T')[0]
    let start = ''
    let end = ''

    if (period === 'day') {
      start = today_str
      end = today_str
    } else if (period === 'week') {
      start = getMonday(today)
      end = getSunday(today)
    } else {
      start = getFirstDay(today)
      end = getLastDay(today)
    }

    setActivePeriod(period)
    setStartDate(start)
    setEndDate(end)
    loadReport(start, end)
  }

  const applyCustomDates = () => {
    setActivePeriod('day')
    loadReport(startDate, endDate)
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('ru-RU').format(Math.round(num))

  const rows = cityReports
    .filter(r => !cityFilter || r.city === cityFilter)
    .map(r => ({
      city: r.city,
      name: user?.name ?? '—',
      turnover: r.orders?.totalClean ?? 0,
      salary: (r.orders?.totalClean ?? 0) * DIRECTOR_SALARY_RATE,
    }))
    .sort((a, b) => b.salary - a.salary)

  const totalSalary = rows.reduce((s, r) => s + r.salary, 0)

  return (
    <div>
      {/* Фильтры */}
      <div className={`rounded-xl border p-4 mb-6 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Быстрые периоды */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</label>
            <div className="flex gap-1">
              {(['day', 'week', 'month'] as const).map((p) => {
                const labels = { day: 'День', week: 'Неделя', month: 'Месяц' }
                return (
                  <button
                    key={p}
                    onClick={() => selectPeriod(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      activePeriod === p
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : isDark
                          ? 'bg-[#3a4451] border-gray-600 text-gray-300 hover:border-teal-600 hover:text-teal-400'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {labels[p]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={`hidden sm:block self-stretch w-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Диапазон дат */}
          <div className="flex items-end gap-2">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>С</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>По</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              />
            </div>
            <button
              onClick={applyCustomDates}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-300 hover:border-teal-600 hover:text-teal-400' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-700'}`}
            >
              →
            </button>
          </div>

          <div className={`hidden sm:block self-stretch w-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Город */}
          <div className="w-44">
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</label>
            <CustomSelect
              value={cityFilter}
              onChange={(v) => setCityFilter(v)}
              options={cityOptions}
              placeholder="Все города"
              selectId="salary-city"
              openSelect={openSelect}
              setOpenSelect={setOpenSelect}
            />
          </div>
        </div>
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-xl mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className={`rounded-lg p-6 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
          <div className={`mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Ошибка: {error}</div>
          <button
            onClick={() => loadReport(startDate, endDate)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Таблица */}
      {!loading && !error && (
        <>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[480px]">
              <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#14b8a6' }}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ФИО</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата (7%)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.city}
                      className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{row.city}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{row.name}</td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{formatNumber(row.turnover)} ₽</td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatNumber(row.salary)} ₽</td>
                    </tr>
                  ))}

                  {/* Итого */}
                  {rows.length > 1 && (
                    <tr className={`border-t-2 ${isDark ? 'border-gray-600 bg-[#3a4451]' : 'border-gray-300 bg-gray-50'}`}>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`} colSpan={2}>Итого</td>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                        {formatNumber(rows.reduce((s, r) => s + r.turnover, 0))} ₽
                      </td>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {formatNumber(totalSalary)} ₽
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="text-center py-12">
              <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет данных для отображения</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SalaryReportPage() {
  return <SalaryReportContent />
}
