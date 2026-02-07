"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient, Employee } from '@/lib/api'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'


function MastersContent() {
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
        // Используем getMasters() вместо getEmployees() - директора не должны видеть других директоров
        const data = await apiClient.getMasters()
        
        // Фильтруем мастеров по городам текущего директора
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
    const aStatus = (a.statusWork || '').toLowerCase()
    const bStatus = (b.statusWork || '').toLowerCase()
    
    const aIsWorking = aStatus.includes('работает') || aStatus.includes('работающий') || aStatus === 'active'
    const bIsWorking = bStatus.includes('работает') || bStatus.includes('работающий') || bStatus === 'active'
    
    // Сначала сортируем по статусу (работающие первыми)
    if (aIsWorking && !bIsWorking) return -1
    if (!aIsWorking && bIsWorking) return 1
    
    // Если статус одинаковый, сортируем по дате создания (новые сначала)
    const aDate = new Date(a.dateCreate || 0).getTime()
    const bDate = new Date(b.dateCreate || 0).getTime()
    return bDate - aDate
  })

  // Вычисляем данные для текущей страницы
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = sortedData.slice(startIndex, endIndex)

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#daece2'}}>
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className="text-gray-700 text-lg mt-4">Загрузка мастеров...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#daece2'}}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 animate-slide-in-left">
          <div className="text-red-600 text-lg">Ошибка: {error}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen" style={{backgroundColor: '#daece2'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#e5e7eb'}}>
            
            {/* Заголовок и кнопка добавления */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Мастера</h1>
              <Button 
                onClick={() => router.push('/employees/add')}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium w-full sm:w-auto"
              >
                + Добавить мастера
              </Button>
            </div>

            {/* Таблица */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[500px]">
                <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Имя</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Логин</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Города</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Статус</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Дата создания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const getStatusColor = (status: string | undefined) => {
                        if (!status) return '#6b7280' // Серый по умолчанию для неопределенного статуса
                        const statusLower = status.toLowerCase()
                        if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
                          return '#10b981' // Яркий зеленый
                        }
                        if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
                          return '#ef4444' // Яркий красный
                        }
                        return '#6b7280' // Серый по умолчанию
                      }
                      
                      // Проверяем, что cities существует и это массив
                      const cities = Array.isArray(item.cities) ? item.cities : []
                      const statusWork = item.statusWork || 'Не указан'
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                          style={{borderColor: '#e5e7eb'}}
                          onClick={() => router.push(`/employees/${item.id}`)}
                        >
                          <td className="py-4 px-4 text-gray-800 align-top">{item.id}</td>
                          <td className="py-4 px-4 text-gray-800 font-semibold align-top">
                            <div className="whitespace-nowrap">{item.name}</div>
                          </td>
                          <td className="py-4 px-4 text-gray-800 align-top">{item.login || '-'}</td>
                          <td className="py-4 px-4 text-gray-800 align-top">
                            <div className="whitespace-nowrap">{cities.length > 0 ? cities.join(', ') : '-'}</div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap" style={{backgroundColor: getStatusColor(item.statusWork)}}>
                              {statusWork}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-800 align-top">{formatDate(item.dateCreate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  maxVisiblePages={7}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default function MastersPage() {
  return <MastersContent />
}
