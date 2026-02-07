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
    <div className="space-y-4">
      {/* Компактная навигация */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button 
            onClick={goToPreviousWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {formatShortDate(weekDates[0])} — {formatShortDate(weekDates[6])}
          </span>
          <button 
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {!isCurrentWeek() && (
          <button 
            onClick={goToCurrentWeek}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Текущая неделя
          </button>
        )}
      </div>

      {/* Компактная таблица с точками */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Заголовок с днями */}
        <div className="grid grid-cols-[1fr_repeat(7,40px)_50px] gap-0 bg-gray-50 border-b border-gray-200">
          <div className="py-2 px-3 text-xs font-medium text-gray-500">Мастер</div>
          {weekDates.map((date, idx) => (
            <div 
              key={idx} 
              className={`py-2 text-center ${isToday(date) ? 'bg-teal-50' : ''}`}
            >
              <div className="text-[10px] text-gray-400 leading-none">{getDayName(date)}</div>
              <div className={`text-xs font-medium mt-0.5 ${isToday(date) ? 'text-teal-600' : 'text-gray-600'}`}>
                {getDayNumber(date)}
              </div>
            </div>
          ))}
          <div className="py-2 px-2 text-center text-[10px] text-gray-400">Дней</div>
        </div>

        {/* Строки мастеров */}
        <div className="divide-y divide-gray-100">
          {masters.map((master) => (
            <div 
              key={master.id} 
              className="grid grid-cols-[1fr_repeat(7,40px)_50px] gap-0 items-center hover:bg-gray-50/50 transition-colors"
            >
              <div className="py-2.5 px-3 text-sm text-gray-800 truncate" title={master.name}>
                {master.name}
              </div>
              
              {weekDates.map((date, idx) => {
                const key = `${master.id}-${toDateString(date)}`
                const isWorking = schedule.get(key) ?? false
                
                return (
                  <div 
                    key={idx} 
                    className={`py-2.5 flex justify-center ${isToday(date) ? 'bg-teal-50/50' : ''}`}
                  >
                    <button
                      onClick={() => toggleSchedule(master.id, date)}
                      className={`
                        w-4 h-4 rounded-full transition-all duration-200 
                        hover:scale-125 cursor-pointer
                        ${isWorking 
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-200' 
                          : 'bg-gray-200 hover:bg-gray-300'
                        }
                      `}
                      title={`${master.name} — ${getDayName(date)}, ${formatShortDate(date)} — ${isWorking ? 'Работает' : 'Выходной'}`}
                    />
                  </div>
                )
              })}
              
              <div className="py-2.5 px-2 text-center">
                <span className={`text-xs font-medium ${
                  getWorkingDaysCount(master.id) >= 5 
                    ? 'text-emerald-600' 
                    : getWorkingDaysCount(master.id) >= 3 
                      ? 'text-amber-600' 
                      : 'text-gray-400'
                }`}>
                  {getWorkingDaysCount(master.id)}/7
                </span>
              </div>
            </div>
          ))}
        </div>

        {masters.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            Нет мастеров
          </div>
        )}
      </div>
    </div>
  )
}
