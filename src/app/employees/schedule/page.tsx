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

// Получить только число
function getDayNumber(date: Date): string {
  return date.getDate().toString().padStart(2, '0')
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

  // Подсчёт рабочих дней для мастера
  const getWorkingDaysCount = (masterId: number): number => {
    let count = 0
    weekDates.forEach(date => {
      const key = `${masterId}-${toDateString(date)}`
      if (schedule.get(key)) count++
    })
    return count
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const dates = getWeekDates(currentMonday)
        const startDate = toDateString(dates[0])
        const endDate = toDateString(dates[6])
        
        const result = await apiClient.getAllMastersSchedules(startDate, endDate)
        
        if (!result) {
          setError('Ошибка загрузки данных')
          return
        }
        
        setMasters(result.masters)
        
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
    
    const newSchedule = new Map(schedule)
    newSchedule.set(key, newValue)
    setSchedule(newSchedule)
    
    try {
      await apiClient.updateMasterSchedule(employeeId, [{ date: dateStr, isWorkDay: newValue }])
    } catch {
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

  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Навигация по неделям */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center bg-white border border-gray-200 rounded-lg">
          <button 
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-50 transition-colors rounded-l-lg border-r border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {formatShortDate(weekDates[0])} — {formatShortDate(weekDates[6])}
          </span>
          <button 
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-50 transition-colors rounded-r-lg border-l border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {!isCurrentWeek() && (
          <button 
            onClick={goToCurrentWeek}
            className="px-3 py-2 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors font-medium"
          >
            Сегодня
          </button>
        )}
      </div>

      {/* Таблица графика */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[240px]">
                Мастер
              </th>
              {weekDates.map((date, idx) => (
                <th 
                  key={idx} 
                  className={`py-3 px-2 text-center w-[52px] ${
                    isToday(date) 
                      ? 'bg-teal-500 text-white' 
                      : isSunday(date) 
                        ? 'bg-red-50 text-red-600' 
                        : ''
                  }`}
                >
                  <div className={`text-[10px] font-medium uppercase ${isToday(date) ? 'text-teal-100' : ''}`}>
                    {getDayName(date)}
                  </div>
                  <div className={`text-sm font-bold ${isToday(date) ? '' : ''}`}>
                    {getDayNumber(date)}
                  </div>
                </th>
              ))}
              <th className="py-3 px-3 text-center w-[60px] text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Дней
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {masters.map((master) => {
              const workDays = getWorkingDaysCount(master.id)
              return (
                <tr 
                  key={master.id} 
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-800 font-medium">
                      {master.name}
                    </span>
                  </td>
                  
                  {weekDates.map((date, idx) => {
                    const key = `${master.id}-${toDateString(date)}`
                    const isWorking = schedule.get(key) ?? false
                    
                    return (
                      <td 
                        key={idx} 
                        className={`py-3 px-2 text-center ${
                          isToday(date) 
                            ? 'bg-teal-50' 
                            : isSunday(date) 
                              ? 'bg-red-50/30' 
                              : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleSchedule(master.id, date)}
                          className={`
                            w-7 h-7 rounded-full transition-all duration-200 
                            flex items-center justify-center mx-auto
                            ${isWorking 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                            }
                          `}
                          title={`${master.name} — ${getDayName(date)}, ${formatShortDate(date)}`}
                        >
                          {isWorking ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}
                  
                  <td className="py-3 px-3 text-center">
                    <span className={`
                      inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-full text-xs font-bold
                      ${workDays >= 5 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : workDays >= 3 
                          ? 'bg-amber-100 text-amber-700' 
                          : workDays > 0
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      {workDays}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {masters.length === 0 && (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 text-sm">Нет мастеров для отображения</p>
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
          <span>Рабочий день</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
          <span>Выходной</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-teal-500 rounded"></span>
          <span>Сегодня</span>
        </div>
      </div>
    </div>
  )
}
