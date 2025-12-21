"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

function MasterHandoverContent() {
  const router = useRouter()
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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Заголовок */}
            <div className="mb-6 animate-slide-down">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Сдача мастеров
              </h1>
              <p className="text-xl text-gray-600">
                Общая сумма: <span className="font-bold text-teal-600">{totalAmount.toLocaleString()} ₽</span>
              </p>
            </div>

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 text-lg">Загрузка данных...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-in-left">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Таблица мастеров */}
            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 bg-gray-50">Имя мастера</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 bg-gray-50">Города</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 bg-gray-50">Общая сумма</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 bg-gray-50">Заказы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(mastersData) && mastersData.filter(master => master.totalAmount > 0).map((master, index) => (
                      <tr 
                        key={master.id} 
                        className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-teal-50 hover:to-emerald-50 transition-all duration-200 cursor-pointer"
                        onClick={() => handleMasterClick(master.id)}
                      >
                        <td className="py-4 px-4 text-gray-800 font-semibold align-top">
                          <div className="whitespace-nowrap">{master.name}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-600 align-top">
                          <div className="whitespace-nowrap">{master.cities?.join(', ') || 'Не указано'}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-800 align-top">
                          {master.totalAmount > 0 ? (
                            <span className="font-bold text-teal-600 text-base">{master.totalAmount.toLocaleString()} ₽</span>
                          ) : (
                            <span className="text-gray-400">0 ₽</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-800 align-top">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm ${
                            master.ordersCount > 0 ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-gray-400'
                          }`}>
                            {master.ordersCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Нет данных */}
            {!loading && !error && mastersData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">Нет данных для отображения</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default function MasterHandoverPage() {
  return <MasterHandoverContent />
}
