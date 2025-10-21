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
      setMasterReports(data)
      
      // Обновляем список доступных мастеров и городов из данных отчета
      const mastersFromData = data.map(report => ({
        id: report.masterId.toString(),
        name: report.masterName
      }))
      setAvailableMasters(mastersFromData)
      
      const citiesFromData = Array.from(new Set(data.map(report => report.city))).map(city => ({
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
  const totalPages = Math.ceil(masterReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = masterReports.slice(startIndex, endIndex)
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
                  onClick={() => loadMastersReport()}
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
                    {/* Первая строка - Мастер и Город */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Мастер</label>
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
                          setSelectedMaster('all')
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
                  <h3 className="text-xl font-semibold text-white mb-4">{city}</h3>
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="min-w-[600px]">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b-2" style={{borderColor: '#114643'}}>
                            <th className="text-left py-3 px-4 font-semibold text-white">Мастер</th>
                            <th className="text-left py-3 px-4 font-semibold text-white">Кол-во заказов</th>
                            <th className="text-left py-3 px-4 font-semibold text-white">Оборот</th>
                            <th className="text-left py-3 px-4 font-semibold text-white">Средний чек</th>
                            <th className="text-left py-3 px-4 font-semibold text-white">Зарплата</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cityData.map((report) => (
                            <tr key={`${report.masterId}-${report.city}`} className="border-b hover:bg-white/10 transition-colors" style={{borderColor: '#114643'}}>
                              <td className="py-3 px-4 text-white font-semibold">{report.masterName}</td>
                              <td className="py-3 px-4 text-white">{report.orders.total}</td>
                              <td className="py-3 px-4 text-white font-semibold" style={{color: '#2a6b68'}}>
                                {formatNumber(report.orders.totalClean)} ₽
                              </td>
                              <td className="py-3 px-4 text-white">
                                {formatNumber(report.orders.avgCheck)} ₽
                              </td>
                              <td className="py-3 px-4 text-white font-semibold" style={{color: '#f59e0b'}}>
                                {formatNumber(report.orders.totalMasterChange)} ₽
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
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors text-xs sm:text-sm"
                >
                  ←
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 sm:px-3 rounded transition-colors text-xs sm:text-sm ${
                      currentPage === page
                        ? 'text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                    style={currentPage === page ? {backgroundColor: '#2a6b68'} : {}}
                    onMouseEnter={currentPage !== page ? (e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57' : undefined}
                    onMouseLeave={currentPage !== page ? (e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68' : undefined}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 sm:px-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors text-xs sm:text-sm"
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
