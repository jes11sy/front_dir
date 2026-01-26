"use client"

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

// Тип мастера из нового API
interface MasterWithSchedule {
  id: number
  name: string
  statusWork: string
  cities: string[]
  schedule: { date: string; isWorkDay: boolean }[]
}

// Получить понедельник текущей недели
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Получить массив дат недели (Пн-Вс)
function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  return dates
}

// Форматировать дату как ДД.ММ.ГГГГ
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Форматировать дату как ДД.ММ
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit'
  })
}

// Получить день недели
function getDayName(date: Date): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  return days[date.getDay()]
}

// Преобразовать дату в строку YYYY-MM-DD (локальная дата, без UTC сдвига)
function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SchedulePage() {
  const [masters, setMasters] = useState<MasterWithSchedule[]>([])
  const [schedule, setSchedule] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonday, setCurrentMonday] = useState<Date>(getMonday(new Date()))
  
  const weekDates = getWeekDates(currentMonday)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Вычисляем даты недели внутри useEffect
        const dates = getWeekDates(currentMonday)
        
        // Один запрос — получаем всех мастеров с графиком
        // Бэкенд сам фильтрует по городам директора и исключает уволенных
        const startDate = toDateString(dates[0])
        const endDate = toDateString(dates[6])
        
        const result = await apiClient.getAllMastersSchedules(startDate, endDate)
        
        if (!result) {
          setError('Ошибка загрузки данных')
          return
        }
        
        setMasters(result.masters)
        
        // Собираем расписание в Map для быстрого доступа
        const scheduleMap = new Map<string, boolean>()
        result.masters.forEach(master => {
          master.schedule.forEach(day => {
            const key = `${master.id}-${day.date}`
            scheduleMap.set(key, day.isWorkDay)
          })
        })
        
        setSchedule(scheduleMap)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentMonday])

  const toggleSchedule = async (employeeId: number, date: Date) => {
    const dateStr = toDateString(date)
    const key = `${employeeId}-${dateStr}`
    const currentValue = schedule.get(key) ?? false
    const newValue = !currentValue
    
    // Оптимистичное обновление UI
    const newSchedule = new Map(schedule)
    newSchedule.set(key, newValue)
    setSchedule(newSchedule)
    
    // Отправляем изменение на сервер
    try {
      await apiClient.updateMasterSchedule(employeeId, [{ date: dateStr, isWorkDay: newValue }])
    } catch {
      // Откатываем изменение при ошибке
      const revertSchedule = new Map(schedule)
      revertSchedule.set(key, currentValue)
      setSchedule(revertSchedule)
    }
  }

  const goToPreviousWeek = () => {
    const newMonday = new Date(currentMonday)
    newMonday.setDate(currentMonday.getDate() - 7)
    setCurrentMonday(newMonday)
  }

  const goToNextWeek = () => {
    const newMonday = new Date(currentMonday)
    newMonday.setDate(currentMonday.getDate() + 7)
    setCurrentMonday(newMonday)
  }

  const goToCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()))
  }

  const isCurrentWeek = () => {
    const today = new Date()
    const todayMonday = getMonday(today)
    return toDateString(currentMonday) === toDateString(todayMonday)
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return toDateString(date) === toDateString(today)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className="text-gray-700 text-lg mt-4">Загрузка графика...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 animate-slide-in-left">
          <div className="text-red-600 text-lg">Ошибка: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-10 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Заголовок и навигация по неделям */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-800">График работы мастеров</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Неделя: {formatDate(weekDates[0])} — {formatDate(weekDates[6])}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPreviousWeek}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                  title="Предыдущая неделя"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={goToCurrentWeek}
                  disabled={isCurrentWeek()}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrentWeek() 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  Сегодня
                </button>
                <button 
                  onClick={goToNextWeek}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                  title="Следующая неделя"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Таблица */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                <thead>
                  <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700 min-w-[180px]">ФИО</th>
                    {weekDates.map((date, idx) => (
                      <th 
                        key={idx} 
                        className={`text-center py-3 px-2 font-semibold min-w-[70px] ${
                          isToday(date) ? 'bg-teal-100' : ''
                        }`}
                      >
                        <div className="text-xs text-gray-500">{getDayName(date)}</div>
                        <div className="text-gray-700">{formatShortDate(date)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {masters.map((master) => (
                    <tr key={master.id} className="border-b hover:bg-gray-50 transition-colors" style={{borderColor: '#e5e7eb'}}>
                      <td className="py-4 px-4 text-gray-800 font-medium">
                        {master.name}
                      </td>
                      {weekDates.map((date, idx) => {
                        const key = `${master.id}-${toDateString(date)}`
                        const isWorking = schedule.get(key) ?? false
                        
                        return (
                          <td 
                            key={idx} 
                            className={`text-center py-3 px-2 ${isToday(date) ? 'bg-teal-50' : ''}`}
                          >
                            <button
                              onClick={() => toggleSchedule(master.id, date)}
                              className={`
                                w-10 h-10 rounded-lg flex items-center justify-center mx-auto
                                transition-all duration-200 cursor-pointer
                                ${isWorking 
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }
                              `}
                              title={isWorking ? 'Работает' : 'Не работает'}
                            >
                              {isWorking ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {masters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет активных мастеров. Добавьте мастеров на странице "Мастера".
              </div>
            )}

            {/* Легенда */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Работает</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span>Не работает</span>
              </div>
              <div className="text-gray-400 ml-auto">
                Нажмите на ячейку для изменения статуса
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
