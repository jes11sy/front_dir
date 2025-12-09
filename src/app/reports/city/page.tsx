"use client"

import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient, CityReport } from '@/lib/api'
import * as XLSX from 'xlsx'


function CityReportContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cityReports, setCityReports] = useState<CityReport[]>([])

  // Загрузка данных
  const loadCityReport = async (filters?: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCityReport(filters)
      setCityReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки отчета')
    } finally {
      setLoading(false)
    }
  }

  // Фильтрация данных
  const applyFilters = () => {
    const filters: { startDate?: string; endDate?: string } = {};
    
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    } else {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      filters.startDate = firstDay.toISOString().split('T')[0]
    }
    
    loadCityReport(filters);
  }

  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const startDateStr = firstDay.toISOString().split('T')[0]
    loadCityReport({ startDate: startDateStr })
  }, [])

  // Форматирование чисел
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  // Форматирование процентов
  const formatPercent = (num: number) => {
    return num.toFixed(1) + '%'
  }

  // Расчёт общих итогов по всем городам
  const totals = {
    turnover: cityReports.reduce((sum, r) => sum + (r.stats?.turnover || r.orders?.totalClean || 0), 0),
    profit: cityReports.reduce((sum, r) => sum + (r.stats?.profit || r.orders?.totalClean || 0), 0),
    totalOrders: cityReports.reduce((sum, r) => sum + (r.stats?.totalOrders || r.orders?.closedOrders || 0), 0),
    notOrders: cityReports.reduce((sum, r) => sum + (r.stats?.notOrders || r.orders?.notOrders || 0), 0),
    zeroOrders: cityReports.reduce((sum, r) => sum + (r.stats?.zeroOrders || 0), 0),
    completedOrders: cityReports.reduce((sum, r) => sum + (r.stats?.completedOrders || 0), 0),
    refusals: cityReports.reduce((sum, r) => sum + (r.orders?.refusals || 0), 0),
    microCheckCount: cityReports.reduce((sum, r) => sum + (r.stats?.microCheckCount || 0), 0),
    over10kCount: cityReports.reduce((sum, r) => sum + (r.stats?.over10kCount || 0), 0),
    masterHandover: cityReports.reduce((sum, r) => sum + (r.stats?.masterHandover || r.orders?.totalMasterChange || 0), 0),
    maxCheck: Math.max(...cityReports.map(r => r.stats?.maxCheck || 0), 0),
  }
  
  // Рассчитываем проценты
  const closedOrders = totals.completedOrders + totals.refusals
  const completedPercent = closedOrders > 0 ? (totals.completedOrders / closedOrders) * 100 : 0
  const efficiency = totals.totalOrders > 0 ? (totals.completedOrders / totals.totalOrders) * 100 : 0
  const avgCheck = totals.completedOrders > 0 ? totals.turnover / totals.completedOrders : 0

  // Экспорт в Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const worksheetData = [
      ['Сводный отчет по всем городам'],
      [],
      ['Показатель', 'Значение'],
      ['Оборот', totals.turnover + ' ₽'],
      ['Прибыль', totals.profit + ' ₽'],
      ['Заказов', totals.totalOrders],
      ['Не заказ', totals.notOrders],
      ['Ноль', totals.zeroOrders],
      ['Выполненных', totals.completedOrders],
      ['Вып в деньги (%)', formatPercent(completedPercent)],
      ['Микрочек (до 10к)', totals.microCheckCount],
      ['От 10к', totals.over10kCount],
      ['Эффективность', formatPercent(efficiency)],
      ['Ср чек', Math.round(avgCheck) + ' ₽'],
      ['Макс чек', totals.maxCheck + ' ₽'],
      ['СД', totals.masterHandover + ' ₽'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Сводный отчет');
    XLSX.writeFile(workbook, `сводный_отчет_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`);
  }

  // Данные для таблицы
  const tableData = [
    { label: 'Оборот', value: formatNumber(totals.turnover) + ' ₽', color: 'text-teal-600', bold: true },
    { label: 'Прибыль', value: formatNumber(totals.profit) + ' ₽', color: 'text-emerald-600', bold: true },
    { label: 'Заказов', value: totals.totalOrders, color: 'text-gray-800' },
    { label: 'Не заказ', value: totals.notOrders, color: 'text-orange-600' },
    { label: 'Ноль', value: totals.zeroOrders, color: 'text-red-500' },
    { label: 'Выполненных', value: totals.completedOrders, color: 'text-green-600', bold: true },
    { 
      label: 'Вып в деньги (%)', 
      value: formatPercent(completedPercent), 
      color: completedPercent >= 70 ? 'text-green-600' : completedPercent >= 50 ? 'text-yellow-600' : 'text-red-600',
      badge: true,
      badgeColor: completedPercent >= 70 ? 'bg-green-100' : completedPercent >= 50 ? 'bg-yellow-100' : 'bg-red-100'
    },
    { label: 'Микрочек (до 10к)', value: totals.microCheckCount, color: 'text-gray-600' },
    { label: 'От 10к', value: totals.over10kCount, color: 'text-purple-600', bold: true },
    { 
      label: 'Эффективность', 
      value: formatPercent(efficiency), 
      color: efficiency >= 50 ? 'text-green-600' : efficiency >= 30 ? 'text-yellow-600' : 'text-red-600',
      badge: true,
      badgeColor: efficiency >= 50 ? 'bg-green-100' : efficiency >= 30 ? 'bg-yellow-100' : 'bg-red-100'
    },
    { label: 'Ср чек', value: formatNumber(Math.round(avgCheck)) + ' ₽', color: 'text-gray-800' },
    { label: 'Макс чек', value: formatNumber(totals.maxCheck) + ' ₽', color: 'text-purple-600', bold: true },
    { label: 'СД', value: formatNumber(totals.masterHandover) + ' ₽', color: 'text-teal-600', bold: true },
  ]

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-10 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.005] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Заголовок */}
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Сводный отчёт по всем городам
            </h1>

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <div className="text-gray-700 text-xl mt-4">Загрузка отчета...</div>
              </div>
            )}

            {/* Состояние ошибки */}
            {error && (
              <div className="text-center py-8 animate-slide-in-left">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="text-red-600 text-xl mb-4">Ошибка: {error}</div>
                  <button 
                    onClick={() => loadCityReport()}
                    className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            )}

            {/* Основной контент */}
            {!loading && !error && (
              <>
                {/* Фильтрация */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 text-left cursor-pointer group"
                    >
                      <h3 className="text-gray-700 font-semibold text-lg group-hover:text-teal-600 transition-colors duration-200">
                        Фильтр по датам
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${showFilters ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                    >
                      Экспорт в Excel
                    </button>
                  </div>
                  
                  {showFilters && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">От даты</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">До даты</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setStartDate('')
                              setEndDate('')
                              const now = new Date()
                              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                              loadCityReport({ startDate: firstDay.toISOString().split('T')[0] })
                            }}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                          >
                            Сбросить
                          </button>
                          <button 
                            onClick={applyFilters}
                            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-md font-medium"
                          >
                            Применить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Таблица со статистикой */}
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-teal-600 to-emerald-600">
                        <th className="text-left py-3 px-4 font-semibold text-white">Показатель</th>
                        <th className="text-right py-3 px-4 font-semibold text-white">Значение</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, index) => (
                        <tr 
                          key={row.label} 
                          className={`border-b border-gray-100 hover:bg-teal-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="py-3 px-4 text-gray-700 font-medium">{row.label}</td>
                          <td className={`py-3 px-4 text-right ${row.color} ${row.bold ? 'font-bold text-lg' : 'font-medium'}`}>
                            {row.badge ? (
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${row.badgeColor} ${row.color}`}>
                                {row.value}
                              </span>
                            ) : (
                              row.value
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Информация о городах */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  Данные по {cityReports.length} {cityReports.length === 1 ? 'городу' : cityReports.length < 5 ? 'городам' : 'городам'}
                  {cityReports.length > 0 && (
                    <span className="ml-2">
                      ({cityReports.map(r => r.city).join(', ')})
                    </span>
                  )}
                </div>

                {/* Легенда */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                  <div className="font-semibold mb-2 text-gray-700">Расшифровка:</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div><span className="font-medium">Оборот</span> — сумма итогов</div>
                    <div><span className="font-medium">Прибыль</span> — сумма чистыми</div>
                    <div><span className="font-medium">Заказов</span> — Готово + Отказ + Незаказ</div>
                    <div><span className="font-medium">Ноль</span> — Готово с итогом 0</div>
                    <div><span className="font-medium">Вып %</span> — Готово / (Готово + Отказ)</div>
                    <div><span className="font-medium">Эффект.</span> — Готово / Заказов</div>
                    <div><span className="font-medium">СД</span> — сдача мастера</div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default function CityReportPage() {
  return (
    <AuthGuard>
      <CityReportContent />
    </AuthGuard>
  )
}
