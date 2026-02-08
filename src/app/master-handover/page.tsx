"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'

function MasterHandoverContent() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const [mastersData, setMastersData] = useState<any[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getMasterHandoverSummary()
        setMastersData(Array.isArray(data.masters) ? data.masters : [])
        setTotalAmount(data.totalAmount || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
        logger.error('Error loading master handover data', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleMasterClick = (masterId: string) => {
    router.push(`/master-handover/${masterId}`)
  }

  // Фильтруем мастеров с суммой > 0
  const filteredMasters = Array.isArray(mastersData) ? mastersData.filter(master => master.totalAmount > 0) : []

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#1e2530]' : 'bg-gray-50'
    }`}>
      {/* Состояние загрузки */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-10 w-10 border-2 mx-auto mb-3 ${
              theme === 'dark' ? 'border-[#0d5c4b] border-t-transparent' : 'border-[#0d5c4b] border-t-transparent'
            }`}></div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Загрузка...</p>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="p-4">
          <div className={`rounded-lg p-4 ${
            theme === 'dark' ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{error}</p>
          </div>
        </div>
      )}

      {/* Таблица на весь экран */}
      {!loading && !error && (
        <div className="w-full">
          {/* Общая сумма к сдаче */}
          {totalAmount > 0 && (
            <div className={`px-4 py-3 border-b ${
              theme === 'dark' ? 'bg-[#2a3441] border-[#0d5c4b]/30' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Общая сумма к сдаче:
                </span>
                <span className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-gray-200' : 'text-[#0d5c4b]'
                }`}>
                  {totalAmount.toLocaleString()} ₽
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className={`sticky top-0 z-10 ${
              theme === 'dark' ? 'bg-[#2a3441]' : 'bg-white'
            }`}>
              <tr className={theme === 'dark' ? 'border-b border-[#0d5c4b]/30' : 'border-b border-gray-200'}>
                <th className={`text-left py-3 px-4 font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Имя мастера</th>
                <th className={`text-left py-3 px-4 font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Города</th>
                <th className={`text-left py-3 px-4 font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Общая сумма</th>
                <th className={`text-left py-3 px-4 font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Заказы</th>
              </tr>
            </thead>
            <tbody>
              {filteredMasters.map((master) => (
                <tr 
                  key={master.id} 
                  className={`cursor-pointer transition-colors duration-150 ${
                    theme === 'dark' 
                      ? 'border-b border-[#0d5c4b]/20 hover:bg-[#2a3441]' 
                      : 'border-b border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => handleMasterClick(master.id)}
                >
                  <td className={`py-3 px-4 font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {master.name}
                  </td>
                  <td className={`py-3 px-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {master.cities?.join(', ') || '—'}
                  </td>
                  <td className={`py-3 px-4 font-semibold ${
                    theme === 'dark' ? 'text-gray-200' : 'text-[#0d5c4b]'
                  }`}>
                    {master.totalAmount.toLocaleString()} ₽
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium ${
                      master.ordersCount > 0 
                        ? 'bg-[#0d5c4b] text-white' 
                        : theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {master.ordersCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Нет данных */}
          {filteredMasters.length === 0 && (
            <div className="text-center py-16">
              <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                Нет данных для отображения
              </p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MasterHandoverPage() {
  return <MasterHandoverContent />
}
