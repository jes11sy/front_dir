"use client"

import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient, CityReport } from '@/lib/api'
import * as XLSX from 'xlsx'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'

function CityReportContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCity, setSelectedCity] = useState('all')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cityReports, setCityReports] = useState<CityReport[]>([])
  const [filteredReports, setFilteredReports] = useState<CityReport[]>([])
  const [availableCities, setAvailableCities] = useState<{ id: string; name: string }[]>([])

  // Получаем список городов из данных отчета
  const cities = [
    { value: 'all', label: 'Все города' },
    ...availableCities.map(c => ({ value: c.id, label: c.name }))
  ]

  // Загрузка данных
  const loadCityReport = async (filters?: { city?: string; startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getCityReport(filters)
      setCityReports(data)
      setFilteredReports(data)
      
      // Обновляем список доступных городов из данных отчета
      const safeData = Array.isArray(data) ? data : []
      const citiesFromData = safeData.map(report => ({
        id: report.city,
        name: report.city
      }))
      setAvailableCities(citiesFromData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки отчета')
    } finally {
      setLoading(false)
    }
  }

  // Фильтрация данных
  const applyFilters = () => {
    const filters: { city?: string; startDate?: string; endDate?: string } = {};
    
    // Фильтр по городу
    if (selectedCity !== 'all') {
      filters.city = selectedCity;
    }
    
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
    loadCityReport(filters);
  }

  useEffect(() => {
    // При загрузке устанавливаем фильтр по текущему месяцу
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const startDateStr = firstDay.toISOString().split('T')[0]
    
    loadCityReport({ startDate: startDateStr })
  }, [])

  // Форматирование чисел
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  // Экспорт в Excel
  const exportToExcel = () => {
    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Подготавливаем данные для листа
    const worksheetData = [
      // Заголовок отчета
      ['Отчет по городам'],
      [], // Пустая строка
      // Заголовки колонок
      ['Город', 'Закрытых заказов', 'Средний чек (₽)', 'Оборот (₽)', 'Доход компании (₽)', 'Касса (₽)'],
      // Данные
      ...(Array.isArray(filteredReports) ? filteredReports : []).map(report => {
        const turnover = report?.orders?.totalClean || 0;
        const companyIncome = report?.orders?.totalMasterChange || 0;
        
        return [
          report?.city || '',
          report?.orders?.closedOrders || 0,
          Math.round(report?.orders?.avgCheck || 0),
          turnover,
          companyIncome,
          report?.cash?.totalAmount || 0
        ];
      })
    ];

    // Создаем лист
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Настройка ширины колонок
    worksheet['!cols'] = [
      { wch: 20 }, // Город
      { wch: 18 }, // Закрытых заказов
      { wch: 18 }, // Средний чек
      { wch: 18 }, // Оборот
      { wch: 20 }, // Доход компании
      { wch: 15 }  // Касса
    ];

    // Стилизация заголовка отчета
    if (worksheet['A1']) {
      worksheet['A1'].s = {
        font: { bold: true, size: 18, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2A6B68" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Объединяем ячейки для заголовка отчета
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
    ];

    // Стилизация заголовков колонок
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach(cell => {
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
    (Array.isArray(filteredReports) ? filteredReports : []).forEach((_, index) => {
      const rowIndex = 4 + index;
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
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

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет по городам');

    // Скачиваем файл
    XLSX.writeFile(workbook, `отчет_по_городам_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`);
  }
  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
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
              {/* Кнопка экспорта для мобильной версии */}
              <div className="block md:hidden mb-3">
                <button 
                  onClick={exportToExcel}
                  className="w-full px-3 py-2 text-white rounded transition-colors text-sm"
                  style={{backgroundColor: '#2a6b68'}}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                >
                  Экспорт в Excel
                </button>
              </div>
              
              <div className="flex items-center justify-between mb-3 animate-slide-in-left">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h3 className="text-gray-700 font-semibold text-lg group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${
                      showFilters ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Кнопка экспорта для десктопной версии */}
                <button 
                  onClick={exportToExcel}
                  className="hidden md:block px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  Экспорт в Excel
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Город */}
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">Город</label>
                      <CustomSelect
                        value={selectedCity}
                        onChange={setSelectedCity}
                        options={cities}
                        placeholder="Выберите город"
                        compact={true}
                        selectId="city"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
                    
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
                          setSelectedCity('all')
                          // Сбрасываем к текущему месяцу
                          const now = new Date()
                          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                          loadCityReport({ startDate: firstDay.toISOString().split('T')[0] })
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

            {/* Статистические карточки */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-in-left">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-teal-600">
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + (city?.orders?.closedOrders || 0), 0))}
                  </div>
                  <div className="text-gray-600 text-sm">Закрытых заказов</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-in-left">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-red-600">
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + (city?.orders?.refusals || 0), 0))}
                  </div>
                  <div className="text-gray-600 text-sm">Всего отказов</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-in-left">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-yellow-600">
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + (city?.orders?.notOrders || 0), 0))}
                  </div>
                  <div className="text-gray-600 text-sm">Всего Незаказов</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-in-left">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-purple-600">
                    {(() => {
                      const totalClosed = (Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + (city?.orders?.closedOrders || 0), 0)
                      const totalClean = (Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + (city?.orders?.totalClean || 0), 0)
                      const avgCheck = totalClosed > 0 ? totalClean / totalClosed : 0
                      return formatNumber(Math.round(avgCheck)) + ' ₽'
                    })()}
                  </div>
                  <div className="text-gray-600 text-sm">Средний чек</div>
                </div>
              </div>
            </div>

            {/* Таблица по городам */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
              <div className="min-w-[600px]">
                <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Закрытых заказов</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Средний чек</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Оборот</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Доход компании</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Касса</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredReports) && filteredReports.map((cityReport) => {
                      // Оборот = сумма чистыми
                      const turnover = cityReport?.orders?.totalClean || 0
                      
                      // Доход компании = сумма сдача мастера
                      const companyIncome = cityReport?.orders?.totalMasterChange || 0
                      
                      return (
                        <tr key={cityReport.city} className="border-b hover:bg-teal-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                          <td className="py-3 px-4 text-gray-800 font-semibold">{cityReport.city}</td>
                          <td className="py-3 px-4 text-gray-800">{formatNumber(cityReport?.orders?.closedOrders || 0)}</td>
                          <td className="py-3 px-4 text-gray-800">{formatNumber(cityReport?.orders?.avgCheck || 0)} ₽</td>
                          <td className="py-3 px-4 text-gray-800 font-semibold text-teal-600">
                            {formatNumber(turnover)} ₽
                          </td>
                          <td className="py-3 px-4 text-gray-800 font-semibold text-teal-600">
                            {formatNumber(companyIncome)} ₽
                          </td>
                          <td className="py-3 px-4 text-gray-800 font-semibold text-teal-600">
                            {formatNumber(cityReport?.cash?.totalAmount || 0)} ₽
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

              </>
            )}

          </div>
        </div>
      </div>
      
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
        
        /* Стили для выпадающих списков */
        .custom-select-option:hover {
          background-color: #2a6b68 !important;
        }
        
        .custom-select-option:focus {
          background-color: #2a6b68 !important;
        }
      `}</style>
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
