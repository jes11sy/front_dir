"use client"

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'

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
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
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
          <div className={`w-5 h-5 border-2 border-[#0d5c4b] border-t-transparent rounded-full animate-spin`}></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl p-4 ${
        isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
      }`}>
        <p className={isDark ? 'text-red-400 text-sm' : 'text-red-600 text-sm'}>{error}</p>
      </div>
    )
  }

  // Мобильная версия - карточки мастеров
  const MobileView = () => (
    <div className="space-y-3 md:hidden">
      {masters.map((master) => {
        const workDays = getWorkingDaysCount(master.id)
        return (
          <div key={master.id} className={`rounded-xl border p-4 ${
            isDark ? 'bg-[#2a3441] border-[#0d5c4b]/30' : 'bg-white border-gray-200'
          }`}>
            {/* Имя и счётчик */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{master.name}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${workDays >= 5 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : workDays >= 3 
                    ? 'bg-amber-100 text-amber-700' 
                    : workDays > 0
                      ? 'bg-red-100 text-red-600'
                      : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'
                }
              `}>
                {workDays}/7
              </span>
            </div>
            
            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((date, idx) => {
                const key = `${master.id}-${toDateString(date)}`
                const isWorking = schedule.get(key) ?? false
                
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <span className={`text-[10px] mb-1 ${
                      isToday(date) 
                        ? 'text-[#0d5c4b] font-bold' 
                        : isSunday(date) 
                          ? 'text-red-500' 
                          : isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {getDayName(date)}
                    </span>
                    <button
                      onClick={() => toggleSchedule(master.id, date)}
                      className={`
                        w-9 h-9 rounded-lg transition-all duration-200 
                        flex items-center justify-center
                        ${isToday(date) ? 'ring-2 ring-[#0d5c4b] ring-offset-1' : ''}
                        ${isWorking 
                          ? 'bg-[#0d5c4b] text-white' 
                          : isDark ? 'bg-[#1e2530] text-gray-500' : 'bg-gray-100 text-gray-400'
                        }
                      `}
                    >
                      <span className="text-xs font-medium">{getDayNumber(date)}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Десктопная версия - таблица
  const DesktopView = () => (
    <div className={`hidden md:block rounded-xl border overflow-hidden shadow-sm ${
      isDark ? 'bg-[#2a3441] border-[#0d5c4b]/30' : 'bg-white border-gray-200'
    }`}>
      <table className="w-full table-fixed">
        <thead>
          <tr className={`border-b ${
            isDark ? 'bg-[#1e2530] border-[#0d5c4b]/30' : 'bg-gray-50 border-gray-200'
          }`}>
            <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Мастер
            </th>
            {weekDates.map((date, idx) => (
              <th 
                key={idx} 
                className={`py-3 px-1 text-center w-[60px] lg:w-[80px] ${
                  isToday(date) 
                    ? 'bg-[#0d5c4b] text-white' 
                    : isSunday(date) 
                      ? isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600' 
                      : isDark ? 'text-gray-300' : ''
                }`}
              >
                <div className={`text-[10px] font-medium uppercase ${isToday(date) ? 'text-white/60' : isDark ? 'text-gray-400' : ''}`}>
                  {getDayName(date)}
                </div>
                <div className={`text-sm font-bold ${isToday(date) ? '' : isDark ? 'text-gray-200' : ''}`}>
                  {getDayNumber(date)}
                </div>
              </th>
            ))}
            <th className={`py-3 px-2 text-center w-[60px] text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Дней
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? 'divide-[#0d5c4b]/20' : 'divide-gray-100'}`}>
          {masters.map((master) => {
            const workDays = getWorkingDaysCount(master.id)
            return (
              <tr 
                key={master.id} 
                className={`transition-colors ${
                  isDark ? 'hover:bg-[#1e2530]/50' : 'hover:bg-gray-50/70'
                }`}
              >
                <td className="py-2.5 px-4">
                  <span className={`text-sm font-medium truncate block ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {master.name}
                  </span>
                </td>
                
                {weekDates.map((date, idx) => {
                  const key = `${master.id}-${toDateString(date)}`
                  const isWorking = schedule.get(key) ?? false
                  
                  return (
                    <td 
                      key={idx} 
                      className={`py-2.5 px-1 text-center ${
                        isToday(date) 
                          ? isDark ? 'bg-[#0d5c4b]/20' : 'bg-[#daece2]/50' 
                          : isSunday(date) 
                            ? isDark ? 'bg-red-900/10' : 'bg-red-50/30' 
                            : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleSchedule(master.id, date)}
                        className={`
                          w-8 h-8 lg:w-9 lg:h-9 rounded-full transition-all duration-200 
                          flex items-center justify-center mx-auto
                          ${isWorking 
                            ? 'bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white shadow-sm' 
                            : isDark 
                              ? 'bg-[#1e2530] hover:bg-[#1e2530]/80 text-gray-500'
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
                          <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
                        )}
                      </button>
                    </td>
                  )
                })}
                
                <td className="py-2.5 px-2 text-center">
                  <span className={`
                    inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full text-xs font-bold
                    ${workDays >= 5 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : workDays >= 3 
                        ? 'bg-amber-100 text-amber-700' 
                        : workDays > 0
                          ? 'bg-red-100 text-red-600'
                          : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'
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
          <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Нет мастеров для отображения</p>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Навигация по неделям */}
      <div className="flex items-center justify-between md:justify-start gap-4 mb-4 md:mb-6">
        <div className={`flex items-center border rounded-lg ${
          isDark ? 'bg-[#2a3441] border-[#0d5c4b]/30' : 'bg-white border-gray-200'
        }`}>
          <button 
            onClick={goToPreviousWeek}
            className={`p-2 md:p-2.5 transition-colors rounded-l-lg border-r ${
              isDark 
                ? 'hover:bg-[#1e2530] border-[#0d5c4b]/30' 
                : 'hover:bg-gray-50 border-gray-200'
            }`}
          >
            <svg className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className={`px-3 md:px-4 py-2 text-sm font-medium min-w-[130px] md:min-w-[160px] text-center ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {formatShortDate(weekDates[0])} — {formatShortDate(weekDates[6])}
          </span>
          <button 
            onClick={goToNextWeek}
            className={`p-2 md:p-2.5 transition-colors rounded-r-lg border-l ${
              isDark 
                ? 'hover:bg-[#1e2530] border-[#0d5c4b]/30' 
                : 'hover:bg-gray-50 border-gray-200'
            }`}
          >
            <svg className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {!isCurrentWeek() && (
          <button 
            onClick={goToCurrentWeek}
            className={`px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
              isDark 
                ? 'text-[#0d5c4b] hover:bg-[#0d5c4b]/20' 
                : 'text-[#0d5c4b] hover:text-[#0a4a3c] hover:bg-[#daece2]/50'
            }`}
          >
            Сегодня
          </button>
        )}
      </div>

      {/* Мобильная версия */}
      <MobileView />

      {/* Десктопная версия */}
      <DesktopView />

      {/* Легенда - только на десктопе */}
      <div className={`hidden md:flex mt-4 items-center gap-6 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-[#0d5c4b] rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
          <span>Рабочий день</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-gray-200'}`}>
            <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
          </span>
          <span>Выходной</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-[#0d5c4b] rounded"></span>
          <span>Сегодня</span>
        </div>
      </div>
    </div>
  )
}
