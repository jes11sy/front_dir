"use client"

import { useState, useEffect } from 'react'
import { apiClient, MasterReport } from '@/lib/api'
import ExcelJS from 'exceljs'

function MastersReportContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [masterReports, setMasterReports] = useState<MasterReport[]>([])
  const [directorCities, setDirectorCities] = useState<string[]>([])

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

  // Фильтрация данных
  const applyFilters = () => {
    const filters: { startDate?: string; endDate?: string } = {};
    
    // Фильтр по датам - если не указаны, используем текущий месяц
    if (startDate || endDate) {
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }
    } else {
      // По умолчанию - текущий месяц с 1 числа
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      filters.startDate = firstDay.toISOString().split('T')[0]
    }
    
    // Загружаем данные с фильтрами
    loadMastersReport(filters);
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
      // Подготавливаем данные для листа
      const worksheetData = [
        // Заголовок города
        [city],
        [], // Пустая строка
        // Заголовки колонок
        ['Мастер', 'Всего заказов', 'Оборот (₽)', 'Средний чек (₽)', 'Зарплата (₽)'],
        // Данные
        ...cityData.map(report => [
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
        { wch: 25 }, // Мастер
        { width: 15 }, // Всего заказов
        { width: 15 }, // Оборот
        { width: 15 }, // Средний чек
        { width: 15 }  // Зарплата
      ];

      // Стилизация заголовка города
      if (worksheet['A1']) {
        worksheet['A1'].s = {
          font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2A6B68" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Объединяем ячейки для заголовка города
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
      ];

      // Стилизация заголовков колонок
      ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1A5A57" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      });

      // Стилизация данных
      cityData.forEach((_, index) => {
        const rowIndex = 4 + index;
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = `${col}${rowIndex}`;
          if (worksheet[cell]) {
            worksheet[cell].s = {
              alignment: { horizontal: col === 'A' ? "left" : "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } }
              }
            };
          }
        });
      });

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

  // Группируем данные по городам (только для мастеров с заказами)
  const dataByCity = masterReports
    .filter(report => report.totalOrders > 0)
    .reduce((acc, report) => {
      if (!acc[report.city]) {
        acc[report.city] = [];
      }
      acc[report.city].push(report);
      return acc;
    }, {} as Record<string, MasterReport[]>);

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
                {/* Панель управления: иконка фильтров + экспорт */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {/* Иконка фильтров */}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative p-2 rounded-lg transition-all duration-200 ${
                          showFilters 
                            ? 'bg-teal-100 text-teal-600' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-teal-600'
                        }`}
                        title="Фильтры"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {/* Индикатор активных фильтров */}
                        {(startDate || endDate) && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white"></span>
                        )}
                      </button>
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
                  
                  {showFilters && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-wrap gap-3 items-end">
                        {/* От даты */}
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">От даты</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                        </div>
                        {/* До даты */}
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">До даты</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                        </div>
                        
                        {/* Кнопки */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setStartDate('')
                              setEndDate('')
                              // Сбрасываем к текущему месяцу
                              const now = new Date()
                              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                              loadMastersReport({ startDate: firstDay.toISOString().split('T')[0] })
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                          >
                            Сбросить
                          </button>
                          <button 
                            onClick={applyFilters}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-md font-medium"
                          >
                            Применить фильтры
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Таблицы по городам директора */}
                {directorCities.map((city, index) => {
                  const cityData = dataByCity[city] || [];
                  
                  return (
                    <div key={city} className="mb-8">
                      <h3 className="text-xl font-semibold text-gray-700 mb-4">
                        {city}
                      </h3>
                      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="min-w-[600px]">
                          <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                            <thead>
                              <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Мастер</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Всего заказов</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Оборот</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Средний чек</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Зарплата</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cityData.map((report) => (
                                <tr key={`${report.masterId}-${report.city}`} className="border-b hover:bg-teal-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                                  <td className="py-3 px-4 text-gray-700 font-semibold">{report.masterName}</td>
                                  <td className="py-3 px-4 text-gray-700">{report.totalOrders}</td>
                                  <td className="py-3 px-4 text-gray-700 font-semibold text-teal-600">
                                    {formatNumber(report.turnover)} ₽
                                  </td>
                                  <td className="py-3 px-4 text-gray-700">
                                    {formatNumber(Math.round(report.avgCheck))} ₽
                                  </td>
                                  <td className="py-3 px-4 text-gray-700 font-semibold text-yellow-600">
                                    {formatNumber(report.salary)} ₽
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Сообщение если нет данных */}
                {directorCities.length === 0 && (
                  <div className="text-center py-8 animate-fade-in">
                    <p className="text-gray-500 font-medium">Нет данных для отображения</p>
                  </div>
                )}
              </>
            )}
      
      <style jsx global>{`
        /* Кастомные скроллбары */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #2a6b68;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #1a5a57;
        }
      `}</style>
    </div>
  )
}

export default function MastersReportPage() {
  return <MastersReportContent />
}