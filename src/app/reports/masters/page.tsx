"use client"

import { useState, useEffect } from 'react'
import AuthGuard from "@/components/auth-guard"
import { apiClient, MasterReport } from '@/lib/api'
import * as XLSX from 'xlsx'

// Импортируем оптимизированный CustomSelect
import CustomSelect from '@/components/optimized/CustomSelect'

function MastersReportContent() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMaster, setSelectedMaster] = useState('all')
  const [selectedCity, setSelectedCity] = useState('all')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [masterReports, setMasterReports] = useState<MasterReport[]>([])
  const [availableMasters, setAvailableMasters] = useState<{ id: string; name: string }[]>([])
  const [availableCities, setAvailableCities] = useState<{ id: string; name: string }[]>([])
  const itemsPerPage = 10

  // Получаем список мастеров и городов из данных отчета
  const masters = [
    { value: 'all', label: 'Все мастера' },
    ...availableMasters.map(m => ({ value: m.id, label: m.name }))
  ]

  const cities = [
    { value: 'all', label: 'Все города' },
    ...availableCities.map(c => ({ value: c.id, label: c.name }))
  ]

  // Загрузка данных
  const loadMastersReport = async (filters?: { masterId?: number; city?: string; startDate?: string; endDate?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getMastersReport(filters)
      const safeData = Array.isArray(data) ? data : []
      setMasterReports(safeData)
      
      // Обновляем список доступных мастеров и городов из данных отчета
      const mastersFromData = safeData.map(report => ({
        id: report.masterId.toString(),
        name: report.masterName
      }))
      setAvailableMasters(mastersFromData)
      
      const citiesFromData = Array.from(new Set(safeData.map(report => report.city))).map(city => ({
        id: city,
        name: city
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
    const filters: { masterId?: number; city?: string; startDate?: string; endDate?: string } = {};
    
    // Фильтр по мастеру
    if (selectedMaster !== 'all') {
      filters.masterId = parseInt(selectedMaster);
    }
    
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
    loadMastersReport(filters);
  }

  useEffect(() => {
    loadMastersReport()
  }, [])

  // Форматирование чисел
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  // Экспорт в Excel
  const exportToExcel = () => {
    // Группируем данные по городам
    const dataByCity = masterReports.reduce((acc, report) => {
      if (!acc[report.city]) {
        acc[report.city] = [];
      }
      acc[report.city].push(report);
      return acc;
    }, {} as Record<string, MasterReport[]>);

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Создаем лист для каждого города
    Object.entries(dataByCity).forEach(([city, cityData]) => {
      // Подготавливаем данные для листа
      const worksheetData = [
        // Заголовок города
        [city],
        [], // Пустая строка
        // Заголовки колонок
        ['Мастер', 'Кол-во заказов', 'Оборот (₽)', 'Средний чек (₽)', 'Зарплата (₽)'],
        // Данные
        ...cityData.map(report => [
          report.masterName,
          report.orders.total,
          report.orders.totalClean,
          Math.round(report.orders.avgCheck),
          report.orders.totalMasterChange
        ])
      ];

      // Создаем лист
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Настройка ширины колонок
      worksheet['!cols'] = [
        { wch: 25 }, // Мастер
        { wch: 15 }, // Кол-во заказов
        { wch: 15 }, // Оборот
        { wch: 15 }, // Средний чек
        { wch: 15 }  // Зарплата
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

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(workbook, worksheet, city);
    });

    // Скачиваем файл
    XLSX.writeFile(workbook, `отчет_по_мастерам_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`);
  }

  // Вычисляем данные для текущей страницы
  const safeMasterReports = Array.isArray(masterReports) ? masterReports : []
  const totalPages = Math.ceil(safeMasterReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = safeMasterReports.slice(startIndex, endIndex)
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
                    onClick={() => loadMastersReport()}
                    className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-gray-700 rounded-lg transition-all duration-200 hover:shadow-md"
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
                  className="w-full px-3 py-2 text-gray-700 rounded transition-colors text-sm"
                >
                  Экспорт в Excel
                </button>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-gray-700 font-semibold">Фильтр</h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                  >
                    {showFilters ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {/* Кнопка экспорта для десктопной версии */}
                <button 
                  onClick={exportToExcel}
                  className="hidden md:block px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  Экспорт в Excel
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Мастер */}
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">Мастер</label>
                      <CustomSelect
                        value={selectedMaster}
                        onChange={setSelectedMaster}
                        options={masters}
                        placeholder="Выберите мастера"
                        compact={true}
                        selectId="master"
                        openSelect={openSelect}
                        setOpenSelect={setOpenSelect}
                      />
                    </div>
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
                          setSelectedMaster('all')
                          setSelectedCity('all')
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                      >
                        Сбросить
                      </button>
                      <button 
                        onClick={applyFilters}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-md font-medium"
                      >
                        Сформировать отчет
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* Таблицы по мастерам, разделенные по городам */}
            {(() => {
              // Группируем данные по городам
              const dataByCity = currentData.reduce((acc, report) => {
                if (!acc[report.city]) {
                  acc[report.city] = [];
                }
                acc[report.city].push(report);
                return acc;
              }, {} as Record<string, typeof currentData>);

              return Object.entries(dataByCity).map(([city, cityData]) => (
                <div key={city} className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">{city}</h3>
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="min-w-[600px]">
                      <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                        <thead>
                          <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Мастер</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Всего заказов</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Выручка</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Расходы</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Прибыль</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cityData.map((report) => (
                            <tr key={`${report.masterId}-${report.city}`} className="border-b hover:bg-teal-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                              <td className="py-3 px-4 text-gray-700 font-semibold">{report.masterName}</td>
                              <td className="py-3 px-4 text-gray-700">{report.totalOrders}</td>
                              <td className="py-3 px-4 text-gray-700 font-semibold text-teal-600">
                                {formatNumber(report.totalRevenue)} ₽
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {formatNumber(report.totalExpenditure)} ₽
                              </td>
                              <td className="py-3 px-4 text-gray-700 font-semibold text-yellow-600">
                                {formatNumber(report.profit)} ₽
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ));
            })()}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 sm:px-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded transition-colors text-xs sm:text-sm font-medium"
                >
                  ←
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 sm:px-3 rounded transition-colors text-xs sm:text-sm font-medium ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 sm:px-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded transition-colors text-xs sm:text-sm font-medium"
                >
                  →
                </button>
              </div>
            )}

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

export default function MastersReportPage() {
  return (
    <AuthGuard>
      <MastersReportContent />
    </AuthGuard>
  )
}
