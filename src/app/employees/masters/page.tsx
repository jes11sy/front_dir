"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient, Employee } from '@/lib/api'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

export default function MastersPage() {
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
        const data = await apiClient.getMasters()
        
        const currentUser = apiClient.getCurrentUser()
        const directorCities = currentUser?.cities || []
        
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
  }, [])

  const safeEmployees = Array.isArray(employees) ? employees : []
  const sortedData = safeEmployees.sort((a, b) => {
    const aStatus = (a.statusWork || '').toLowerCase()
    const bStatus = (b.statusWork || '').toLowerCase()
    
    const aIsWorking = aStatus.includes('работает') || aStatus.includes('работающий') || aStatus === 'active'
    const bIsWorking = bStatus.includes('работает') || bStatus.includes('работающий') || bStatus === 'active'
    
    if (aIsWorking && !bIsWorking) return -1
    if (!aIsWorking && bIsWorking) return 1
    
    const aDate = new Date(a.dateCreate || 0).getTime()
    const bDate = new Date(b.dateCreate || 0).getTime()
    return bDate - aDate
  })

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
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <div className="text-gray-700 text-lg mt-4">Загрузка мастеров...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-600 text-lg">Ошибка: {error}</div>
      </div>
    )
  }
  
  return (
    <div>
      {/* Кнопка добавления */}
      <div className="mb-6 flex justify-end">
        <Button 
          onClick={() => router.push('/employees/add')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          + Добавить мастера
        </Button>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Имя</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Логин</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Города</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата создания</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item) => {
              const getStatusColor = (status: string | undefined) => {
                if (!status) return '#6b7280'
                const statusLower = status.toLowerCase()
                if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
                  return '#10b981'
                }
                if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
                  return '#ef4444'
                }
                return '#6b7280'
              }
              
              const cities = Array.isArray(item.cities) ? item.cities : []
              const statusWork = item.statusWork || 'Не указан'
              
              return (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/employees/${item.id}`)}
                >
                  <td className="py-3 px-4 text-gray-800">{item.id}</td>
                  <td className="py-3 px-4 text-gray-800 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-gray-600">{item.login || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{cities.length > 0 ? cities.join(', ') : '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getStatusColor(item.statusWork)}}>
                      {statusWork}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(item.dateCreate)}</td>
                </tr>
              )
            })}
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
