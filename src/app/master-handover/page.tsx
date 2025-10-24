"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import AuthGuard from "@/components/auth-guard"

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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            

            {/* Заголовок */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                Общая сумма: {totalAmount.toLocaleString()} ₽
              </h1>
            </div>

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Загрузка данных...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Таблица мастеров */}
            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2" style={{borderColor: '#114643'}}>
                      <th className="text-left py-4 px-4 font-semibold text-white">Имя мастера</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Города</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Общая сумма</th>
                      <th className="text-left py-4 px-4 font-semibold text-white">Запросы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(mastersData) && mastersData.filter(master => master.totalAmount > 0).map((master, index) => (
                      <tr 
                        key={master.id} 
                        className="border-b hover:bg-white/10 transition-colors cursor-pointer" 
                        style={{borderColor: '#114643'}}
                        onClick={() => handleMasterClick(master.id)}
                      >
                        <td className="py-4 px-4 text-white font-semibold align-top">
                          <div className="whitespace-nowrap">{master.name}</div>
                        </td>
                        <td className="py-4 px-4 text-white align-top">
                          <div className="whitespace-nowrap">{master.cities?.join(', ') || 'Не указано'}</div>
                        </td>
                        <td className="py-4 px-4 text-white align-top">
                          {master.totalAmount > 0 ? (
                            <span className="font-semibold">{master.totalAmount.toLocaleString()} ₽</span>
                          ) : (
                            <span className="text-gray-500">0 ₽</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-white align-top">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                            master.requestsCount > 0 ? 'bg-orange-500' : 'bg-gray-500'
                          }`}>
                            {master.requestsCount}
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
                <p className="text-gray-400">Нет данных для отображения</p>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  )
}

export default function MasterHandoverPage() {
  return (
    <AuthGuard>
      <MasterHandoverContent />
    </AuthGuard>
  )
}
