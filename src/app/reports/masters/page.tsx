"use client"

import { useState, useEffect } from 'react'
import { apiClient, MasterReport } from '@/lib/api'
import ExcelJS from 'exceljs'
import CustomSelect from '@/components/optimized/CustomSelect'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

function MastersReportContent() {
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'
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

  // Получаем города директора из Zustand store
  const userCities = user?.cities || []
  
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


  return (
    <div>
      {/* Состояние загрузки */}
      {loading && (
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-xl mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка отчета...</div>
        </div>
      )}

      {/* Состояние ошибки */}
      {error && (
        <div className="text-center py-8 animate-slide-in-left">
          <div className={`rounded-lg p-6 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <div className={`text-xl mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Ошибка: {error}</div>
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
                  className={`relative p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300 hover:text-teal-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'}`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {activeFiltersCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#2a3441]' : 'border-white'}`}></span>
                  )}
                </button>

                {/* Активные фильтры как теги */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {startDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        От: {new Date(startDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setStartDate(''); loadMastersReport({ endDate: endDate || undefined }) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadMastersReport({ startDate: startDate || undefined }) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {cityFilter}
                        <button onClick={() => setCityFilter('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'}`}
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
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                        <input
                          type="date"
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                  {/* Секция: Город */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                    
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
                <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
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
                <h3 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {city}
                  <span className={`text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({sortedCityData.length} {sortedCityData.length === 1 ? 'мастер' : sortedCityData.length < 5 ? 'мастера' : 'мастеров'})
                  </span>
                </h3>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <div className="min-w-[600px]">
                    <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                      <thead>
                        <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#14b8a6'}}>
                          <th className={`text-center py-3 px-3 font-semibold w-16 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Место</th>
                          <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</th>
                          <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Всего заказов</th>
                          <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                          <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Средний чек</th>
                          <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCityData.map((report, index) => {
                          const rank = index + 1
                          
                          return (
                            <tr 
                              key={`${report.masterId}-${report.city}`} 
                              className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}
                            >
                              <td className={`py-3 px-3 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {rank}
                              </td>
                              <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                {report.masterName}
                              </td>
                              <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{report.totalOrders}</td>
                              <td className={`py-3 px-4 font-semibold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                {formatNumber(report.turnover)} ₽
                              </td>
                              <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {formatNumber(Math.round(report.avgCheck))} ₽
                              </td>
                              <td className={`py-3 px-4 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
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
              <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет данных для отображения</p>
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
