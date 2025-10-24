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
    
    // Фильтр по датам
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }
    
    // Загружаем данные с фильтрами
    loadCityReport(filters);
  }

  useEffect(() => {
    loadCityReport()
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
        const turnover = report.orders.totalClean;
        const companyIncome = report.orders.totalMasterChange;
        
        return [
          report.city,
          report.orders.closedOrders,
          Math.round(report.orders.avgCheck),
          turnover,
          companyIncome,
          report.cash.totalAmount
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8">
                <div className="text-white text-xl">Загрузка отчета...</div>
              </div>
            )}

            {/* Состояние ошибки */}
            {error && (
              <div className="text-center py-8">
                <div className="text-red-400 text-xl mb-4">Ошибка: {error}</div>
                <button 
                  onClick={() => loadCityReport()}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Попробовать снова
                </button>
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
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-semibold">Фильтр</h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                  >
                    {showFilters ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {/* Кнопка экспорта для десктопной версии */}
                <button 
                  onClick={exportToExcel}
                  className="hidden md:block px-3 py-1 text-white rounded transition-colors text-sm"
                  style={{backgroundColor: '#2a6b68'}}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                >
                  Экспорт в Excel
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="space-y-4">
                    {/* Первая строка - Город */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Город</label>
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
                    
                    {/* Вторая строка - Даты */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">От даты</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm"
                          style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = '#334155'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">До даты</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm"
                          style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = '#334155'}
                        />
                      </div>
                    </div>
                    
                    {/* Третья строка - Кнопки */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                          setSelectedCity('all')
                        }}
                        className="w-full sm:w-auto px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                      >
                        Сбросить
                      </button>
                      <button 
                        onClick={applyFilters}
                        className="w-full sm:w-auto px-3 py-1.5 text-white rounded text-sm transition-colors"
                        style={{backgroundColor: '#2a6b68'}}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                      >
                        Сформировать отчет
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Статистические карточки */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-6 border" style={{borderColor: '#114643'}}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2" style={{color: '#2a6b68'}}>
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + city.orders.closedOrders, 0))}
                  </div>
                  <div className="text-gray-300 text-sm">Закрытых заказов</div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 border" style={{borderColor: '#dc143c'}}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2" style={{color: '#dc143c'}}>
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + city.orders.refusals, 0))}
                  </div>
                  <div className="text-gray-300 text-sm">Всего отказов</div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 border" style={{borderColor: '#f59e0b'}}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2" style={{color: '#f59e0b'}}>
                    {formatNumber((Array.isArray(filteredReports) ? filteredReports : []).reduce((sum, city) => sum + city.orders.notOrders, 0))}
                  </div>
                  <div className="text-gray-300 text-sm">Всего Незаказов</div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 border" style={{borderColor: '#8b5cf6'}}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2" style={{color: '#8b5cf6'}}>
                    {Array.isArray(filteredReports) && filteredReports.length > 0 
                      ? formatNumber(filteredReports.reduce((sum, city) => sum + city.orders.avgCheck, 0) / filteredReports.length) + ' ₽'
                      : '0 ₽'
                    }
                  </div>
                  <div className="text-gray-300 text-sm">Средний чек</div>
                </div>
              </div>
            </div>

            {/* Таблица по городам */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[600px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2" style={{borderColor: '#114643'}}>
                      <th className="text-left py-3 px-4 font-semibold text-white">Город</th>
                      <th className="text-left py-3 px-4 font-semibold text-white">Закрытых заказов</th>
                      <th className="text-left py-3 px-4 font-semibold text-white">Средний чек</th>
                      <th className="text-left py-3 px-4 font-semibold text-white">Оборот</th>
                      <th className="text-left py-3 px-4 font-semibold text-white">Доход компании</th>
                      <th className="text-left py-3 px-4 font-semibold text-white">Касса</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredReports) && filteredReports.map((cityReport) => {
                      // Оборот = сумма чистыми
                      const turnover = cityReport.orders.totalClean
                      
                      // Доход компании = сумма сдача мастера
                      const companyIncome = cityReport.orders.totalMasterChange
                      
                      return (
                        <tr key={cityReport.city} className="border-b hover:bg-white/10 transition-colors" style={{borderColor: '#114643'}}>
                          <td className="py-3 px-4 text-white font-semibold">{cityReport.city}</td>
                          <td className="py-3 px-4 text-white">{formatNumber(cityReport.orders.closedOrders)}</td>
                          <td className="py-3 px-4 text-white">{formatNumber(cityReport.orders.avgCheck)} ₽</td>
                          <td className="py-3 px-4 text-white font-semibold" style={{color: '#2a6b68'}}>
                            {formatNumber(turnover)} ₽
                          </td>
                          <td className="py-3 px-4 text-white font-semibold" style={{color: '#3b82f6'}}>
                            {formatNumber(companyIncome)} ₽
                          </td>
                          <td className="py-3 px-4 text-white font-semibold" style={{color: '#f59e0b'}}>
                            {formatNumber(cityReport.cash.totalAmount)} ₽
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
