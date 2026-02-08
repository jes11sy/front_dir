"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient, Employee } from '@/lib/api'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

export default function MastersPage() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'
  const [currentPage, setCurrentPage] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 10

  // Фильтры
  const [showFilters, setShowFilters] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'working' | 'fired' | 'all'>('working') // По умолчанию только работающие

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getMasters()
        
        // Используем города из Zustand store
        const directorCities = user?.cities || []
        
        const safeData = Array.isArray(data) ? data : []
        const filteredEmployees = safeData.filter(employee => {
          if (directorCities.length === 0) return true
          return employee.cities && Array.isArray(employee.cities) && employee.cities.some(city => directorCities.includes(city))
        })
        
        setEmployees(filteredEmployees)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки сотрудников')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [user])

  // Проверка статуса работы
  const isWorking = (status: string | undefined) => {
    if (!status) return false
    const statusLower = status.toLowerCase()
    return statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active'
  }

  const isFired = (status: string | undefined) => {
    if (!status) return false
    const statusLower = status.toLowerCase()
    return statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive'
  }

  // Фильтрация и сортировка данных
  const filteredAndSortedData = useMemo(() => {
    const safeEmployees = Array.isArray(employees) ? employees : []
    
    // Фильтруем по статусу
    let filtered = safeEmployees.filter(employee => {
      if (statusFilter === 'working') return isWorking(employee.statusWork)
      if (statusFilter === 'fired') return isFired(employee.statusWork)
      return true // 'all'
    })
    
    // Фильтруем по имени
    if (searchName.trim()) {
      const searchLower = searchName.toLowerCase().trim()
      filtered = filtered.filter(employee => 
        employee.name?.toLowerCase().includes(searchLower)
      )
    }
    
    // Сортируем
    return filtered.sort((a, b) => {
      const aIsWorking = isWorking(a.statusWork)
      const bIsWorking = isWorking(b.statusWork)
      
      if (aIsWorking && !bIsWorking) return -1
      if (!aIsWorking && bIsWorking) return 1
      
      const aDate = new Date(a.dateCreate || 0).getTime()
      const bDate = new Date(b.dateCreate || 0).getTime()
      return bDate - aDate
    })
  }, [employees, statusFilter, searchName])

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredAndSortedData.slice(startIndex, endIndex)

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, statusFilter])

  // Проверка есть ли активные фильтры (кроме дефолтного)
  const hasActiveFilters = searchName.trim() !== '' || statusFilter !== 'working'

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
          isDark ? 'border-[#0d5c4b]' : 'border-[#0d5c4b]'
        }`}></div>
        <div className={`text-lg mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка мастеров...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg p-6 ${
        isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
      }`}>
        <div className={isDark ? 'text-red-400 text-lg' : 'text-red-600 text-lg'}>Ошибка: {error}</div>
      </div>
    )
  }
  
  return (
    <div>
      {/* Панель управления: фильтры + добавление */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Иконка фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-lg transition-all duration-200 ${
              showFilters 
                ? isDark 
                  ? 'bg-[#0d5c4b]/20 text-[#0d5c4b]'
                  : 'bg-[#daece2] text-[#0d5c4b]'
                : isDark
                  ? 'bg-[#2a3441] text-gray-400 hover:bg-[#2a3441]/80 hover:text-[#0d5c4b]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#0d5c4b]'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {/* Индикатор активных фильтров */}
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0d5c4b] rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>

        <Button 
          onClick={() => router.push('/employees/add')}
          className="px-4 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors text-sm font-medium"
        >
          + Добавить мастера
        </Button>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className={`mb-6 p-4 rounded-lg border animate-fade-in ${
          isDark 
            ? 'bg-[#2a3441] border-[#0d5c4b]/30' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Поиск по имени */}
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Поиск по имени</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Введите имя..."
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#1e2530] border-[#0d5c4b]/30 text-gray-200 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Статус */}
            <div className="min-w-[180px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'working' | 'fired' | 'all')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#1e2530] border-[#0d5c4b]/30 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <option value="working">Работает</option>
                <option value="fired">Уволен</option>
                <option value="all">Все</option>
              </select>
            </div>

            {/* Кнопка сброса */}
            <button
              onClick={() => {
                setSearchName('')
                setStatusFilter('working')
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors font-medium ${
                isDark 
                  ? 'bg-[#1e2530] hover:bg-[#1e2530]/80 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={`border-b-2 ${
              isDark ? 'border-[#0d5c4b]/30 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'
            }`}>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Имя</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Логин</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Города</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата создания</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {hasActiveFilters 
                    ? 'Нет мастеров по заданным фильтрам'
                    : 'Нет работающих мастеров'
                  }
                </td>
              </tr>
            ) : (
              currentData.map((item) => {
                const getStatusColor = (status: string | undefined) => {
                  if (!status) return '#6b7280'
                  const statusLower = status.toLowerCase()
                  if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
                    return '#0d5c4b'
                  }
                  if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
                    return '#6b7280'
                  }
                  return '#6b7280'
                }
                
                const cities = Array.isArray(item.cities) ? item.cities : []
                const statusWork = item.statusWork || 'Не указан'
                
                return (
                  <tr 
                    key={item.id} 
                    className={`border-b transition-colors cursor-pointer ${
                      isDark 
                        ? 'border-[#0d5c4b]/20 hover:bg-[#2a3441]' 
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                    onClick={() => router.push(`/employees/${item.id}`)}
                  >
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.id}</td>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.login || '-'}</td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{cities.length > 0 ? cities.join(', ') : '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getStatusColor(item.statusWork)}}>
                        {statusWork}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(item.dateCreate)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-6">
          <OptimizedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  )
}
