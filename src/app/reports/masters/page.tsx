"use client"

import { useState, useEffect } from 'react'
import { apiClient, MasterReport } from '@/lib/api'
import ExcelJS from 'exceljs'
import CustomSelect from '@/components/optimized/CustomSelect'

function MastersReportContent() {
  // Основные фильтры (применённые)
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
  const [masterReports, setMasterReports] = useState<MasterReport[]>([])
  const [directorCities, setDirectorCities] = useState<string[]>([])

  // Получаем города директора
  const currentUser = apiClient.getCurrentUser()
  const userCities = currentUser?.cities || []
  
  // Опции для фильтра по городу
  const cityOptions = userCities.map(city => ({
    value: city,
    label: city
  }))

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
  const activeFiltersCount = [startDate, endDate, cityFilter].filter(Boolean).length

  // Открытие drawer - копируем текущие фильтры в черновик
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftCityFilter(cityFilter)
    setShowFilterDrawer(true)
  }

  // Сброс черновых фильтров
  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftCityFilter('')
  }

  // Применить фильтры из черновика
  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setCityFilter(draftCityFilter)
    setShowFilterDrawer(false)
    
    // Загружаем данные с новыми фильтрами
    const filters: { startDate?: string; endDate?: string } = {}
    if (draftStartDate) filters.startDate = draftStartDate
    if (draftEndDate) filters.endDate = draftEndDate
    
    if (!draftStartDate && !draftEndDate) {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      filters.startDate = firstDay.toISOString().split('T')[0]
    }
    
    loadMastersReport(filters)
  }

  // Сброс основных фильтров (при клике на теги)
  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setCityFilter('')
    
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    loadMastersReport({ startDate: firstDay.toISOString().split('T')[0] })
  }

  // Загрузка данных
  const loadMastersReport = async (filters?: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getMastersReport(filters)
      const safeData = Array.isArray(data) ? data : []
      // Фильтруем мастеров с 0 заказов
      const filteredData = safeData.filter(report => report.totalOrders > 0)
      setMasterReports(filteredData)
      
      // Получаем уникальные города директора из отфильтрованных данных
      const cities = Array.from(new Set(filteredData.map(report => report.city)))
      setDirectorCities(cities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки отчета')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // При загрузке устанавливаем фильтр по текущему месяцу
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const startDateStr = firstDay.toISOString().split('T')[0]
    
    loadMastersReport({ startDate: startDateStr })
  }, [])

  // Форматирование чисел
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  // Экспорт в Excel
  const exportToExcel = async () => {
    // Фильтруем мастеров с 0 заказов и группируем данные по городам
    const filteredReports = masterReports.filter(report => report.totalOrders > 0)
    const dataByCity = filteredReports.reduce((acc, report) => {
      if (!acc[report.city]) {
        acc[report.city] = [];
      }
      acc[report.city].push(report);
      return acc;
    }, {} as Record<string, MasterReport[]>);

    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();

    // Создаем лист для каждого города
    Object.entries(dataByCity).forEach(([city, cityData]) => {
      // Сортируем по обороту для рейтинга
      const sortedData = [...cityData].sort((a, b) => b.turnover - a.turnover)
      
      // Подготавливаем данные для листа
      const worksheetData = [
        // Заголовок города
        [city],
        [], // Пустая строка
        // Заголовки колонок
        ['Место', 'Мастер', 'Всего заказов', 'Оборот (₽)', 'Средний чек (₽)', 'Зарплата (₽)'],
        // Данные
        ...sortedData.map((report, index) => [
          index + 1,
          report.masterName,
          report.totalOrders,
          report.turnover,
          Math.round(report.avgCheck),
          report.salary
        ])
      ];

      // Создаем лист
      const worksheet = workbook.addWorksheet(city);
      worksheet.addRows(worksheetData);

      // Настройка ширины колонок
      worksheet.columns = [
        { width: 8 },  // Место
        { width: 25 }, // Мастер
        { width: 15 }, // Всего заказов
        { width: 15 }, // Оборот
        { width: 15 }, // Средний чек
        { width: 15 }  // Зарплата
      ];
    });

    // Скачиваем файл
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `отчет_по_мастерам_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Группируем данные по городам и сортируем по обороту для рейтинга
  const getDataByCity = () => {
    let filteredData = masterReports.filter(report => report.totalOrders > 0)
    
    // Применяем фильтр по городу
    if (cityFilter) {
      filteredData = filteredData.filter(report => report.city === cityFilter)
    }
    
    return filteredData.reduce((acc, report) => {
      if (!acc[report.city]) {
        acc[report.city] = [];
      }
      acc[report.city].push(report);
      return acc;
    }, {} as Record<string, MasterReport[]>)
  }

  const dataByCity = getDataByCity()
  
  // Города для отображения (с учётом фильтра)
  const displayCities = cityFilter 
    ? directorCities.filter(city => city === cityFilter)
    : directorCities

  // Функция для получения стиля топ-3
  const getTopStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400'
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-100 border-l-4 border-gray-400'
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-300'
      default:
        return ''
    }
  }

  // Функция для получения бейджа топ-3
  const getTopBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-white text-xs font-bold shadow-sm">
            1
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 text-white text-xs font-bold shadow-sm">
            2
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-400 text-white text-xs font-bold shadow-sm">
            3
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">
            {rank}
          </span>
        )
    }
  }

  return (
    <div>
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
              onClick={() => loadMastersReport()}
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
          {/* Панель управления */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
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
                        <button onClick={() => { setStartDate(''); loadMastersReport({ endDate: endDate || undefined }) }} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadMastersReport({ startDate: startDate || undefined }) }} className="hover:text-teal-900 ml-1">×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        {cityFilter}
                        <button onClick={() => setCityFilter('')} className="hover:text-teal-900 ml-1">×</button>
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
              
              {/* Кнопка экспорта */}
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Excel</span>
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
                {/* Header - только на десктопе */}
                <div className="hidden md:flex sticky top-0 bg-white border-b border-gray-200 px-4 py-3 items-center justify-between z-10">
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

                {/* Кнопка скрыть - только на мобильных */}
                <div className="md:hidden sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

                  {/* Секция: Город */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Город</h3>
                    
                    <CustomSelect
                      value={draftCityFilter}
                      onChange={(value) => setDraftCityFilter(value)}
                      options={[{ value: '', label: 'Все города' }, ...cityOptions]}
                      placeholder="Выберите город"
                      selectId="filter-city"
                      openSelect={filterOpenSelect}
                      setOpenSelect={setFilterOpenSelect}
                    />
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

          {/* Таблицы по городам директора */}
          {displayCities.map((city) => {
            const cityData = dataByCity[city] || [];
            // Сортируем по обороту для определения рейтинга
            const sortedCityData = [...cityData].sort((a, b) => b.turnover - a.turnover)
            
            return (
              <div key={city} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  {city}
                  <span className="text-sm font-normal text-gray-500">
                    ({sortedCityData.length} {sortedCityData.length === 1 ? 'мастер' : sortedCityData.length < 5 ? 'мастера' : 'мастеров'})
                  </span>
                </h3>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <div className="min-w-[600px]">
                    <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg overflow-hidden">
                      <thead>
                        <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 w-16">Место</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Мастер</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Всего заказов</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Оборот</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Средний чек</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Зарплата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCityData.map((report, index) => {
                          const rank = index + 1
                          const isTop3 = rank <= 3
                          
                          return (
                            <tr 
                              key={`${report.masterId}-${report.city}`} 
                              className={`border-b hover:bg-teal-50 transition-colors ${getTopStyle(rank)}`}
                              style={{borderColor: '#e5e7eb'}}
                            >
                              <td className="py-3 px-3 text-center">
                                {getTopBadge(rank)}
                              </td>
                              <td className={`py-3 px-4 text-gray-700 ${isTop3 ? 'font-bold' : 'font-semibold'}`}>
                                {report.masterName}
                              </td>
                              <td className="py-3 px-4 text-gray-700">{report.totalOrders}</td>
                              <td className={`py-3 px-4 font-semibold ${isTop3 ? 'text-teal-700' : 'text-teal-600'}`}>
                                {formatNumber(report.turnover)} ₽
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {formatNumber(Math.round(report.avgCheck))} ₽
                              </td>
                              <td className={`py-3 px-4 font-semibold ${isTop3 ? 'text-yellow-700' : 'text-yellow-600'}`}>
                                {formatNumber(report.salary)} ₽
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Сообщение если нет данных */}
          {displayCities.length === 0 && (
            <div className="text-center py-8 animate-fade-in">
              <p className="text-gray-500 font-medium">Нет данных для отображения</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function MastersReportPage() {
  return <MastersReportContent />
}
