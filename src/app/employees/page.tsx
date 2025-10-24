"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient, Employee } from '@/lib/api'

import AuthGuard from "@/components/auth-guard"

function EmployeesContent() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getEmployees()
        
        // Фильтруем сотрудников по городам текущего директора
        const currentUser = apiClient.getCurrentUser()
        const directorCities = currentUser?.cities || []
        
        const safeData = Array.isArray(data) ? data : []
        const filteredEmployees = safeData.filter(employee => {
          // Если у директора нет городов, показываем всех
          if (directorCities.length === 0) return true
          
          // Проверяем, есть ли пересечение городов сотрудника и директора
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
  }, [])

  // Сортируем данные: сначала работающие, потом уволенные, внутри группы по дате создания (новые сначала)
  const safeEmployees = Array.isArray(employees) ? employees : []
  const sortedData = safeEmployees.sort((a, b) => {
    const aStatus = a.statusWork.toLowerCase()
    const bStatus = b.statusWork.toLowerCase()
    
    const aIsWorking = aStatus.includes('работает') || aStatus.includes('работающий') || aStatus === 'active'
    const bIsWorking = bStatus.includes('работает') || bStatus.includes('работающий') || bStatus === 'active'
    
    // Сначала сортируем по статусу (работающие первыми)
    if (aIsWorking && !bIsWorking) return -1
    if (!aIsWorking && bIsWorking) return 1
    
    // Если статус одинаковый, сортируем по дате создания (новые сначала)
    const aDate = new Date(a.dateCreate).getTime()
    const bDate = new Date(b.dateCreate).getTime()
    return bDate - aDate
  })

  // Вычисляем данные для текущей страницы
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = sortedData.slice(startIndex, endIndex)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-lg">Загрузка сотрудников...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-red-400 text-lg">Ошибка: {error}</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Заголовок */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Сотрудники</h1>
            </div>
            
            {/* Кнопка добавления */}
            <div className="mb-6 flex justify-end">
              <Button 
                onClick={() => router.push('/employees/add')}
                className="px-4 py-2 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-sm sm:text-sm w-full sm:w-auto"
                style={{backgroundColor: '#2a6b68'}}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
              >
                + Добавить сотрудника
              </Button>
            </div>

            {/* Таблица */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[500px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2" style={{borderColor: '#114643'}}>
                      <th className="text-left py-4 px-4 font-semibold text-white">ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Имя</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Логин</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Города</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Статус</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Дата создания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const getStatusColor = (status: string) => {
                        const statusLower = status.toLowerCase()
                        if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
                          return '#10b981' // Яркий зеленый
                        }
                        if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
                          return '#ef4444' // Яркий красный
                        }
                        return '#6b7280' // Серый по умолчанию
                      }
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b hover:bg-white/10 transition-colors cursor-pointer" 
                          style={{borderColor: '#114643'}}
                          onClick={() => router.push(`/employees/${item.id}`)}
                        >
                          <td className="py-4 px-4 text-white align-top">{item.id}</td>
                          <td className="py-4 px-4 text-white font-semibold align-top">
                            <div className="whitespace-nowrap">{item.name}</div>
                          </td>
                          <td className="py-4 px-4 text-white align-top">{item.login || '-'}</td>
                          <td className="py-4 px-4 text-white align-top">
                            <div className="whitespace-nowrap">{item.cities.join(', ')}</div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap" style={{backgroundColor: getStatusColor(item.statusWork)}}>
                              {item.statusWork}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white align-top">{formatDate(item.dateCreate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

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

          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  return (
    <AuthGuard>
      <EmployeesContent />
    </AuthGuard>
  )
}