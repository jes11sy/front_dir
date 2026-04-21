"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'

function MasterHandoverContent() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
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
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className="px-4 py-6">
        {/* Состояние загрузки */}
        {loading && <LoadingState isDark={isDark} message="Загрузка сдач..." />}

        {/* Ошибка */}
        {error && (
          <NetworkError
            isDark={isDark}
            onRetry={() => window.location.reload()}
            title="Ошибка загрузки"
            message={error}
            buttonText="Обновить"
          />
        )}

        {/* Контент */}
        {!loading && !error && (
          <div className="w-full animate-fade-in">
            {/* Общая сумма к сдаче */}
          {totalAmount > 0 && (
            <div className={`mb-4 rounded-[20px] border px-4 py-4 ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Общая сумма к сдаче:
                </span>
                <span className={`text-lg font-bold ${
                  isDark ? 'text-white' : 'text-[#0a4f42]'
                }`}>
                  {totalAmount.toLocaleString()} ₽
                </span>
              </div>
            </div>
          )}

          {/* Десктопная таблица */}
            {filteredMasters.length > 0 && (
              <div className="hidden md:block">
                <table className={`w-full border-collapse text-sm rounded-[20px] overflow-hidden ${
                  isDark ? 'bg-white/[0.02] border border-white/10' : 'bg-white border border-black/10'
                }`}>
                  <thead>
                    <tr className={isDark ? 'border-b border-white/10 bg-white/[0.02]' : 'border-b border-black/10 bg-black/[0.02]'}>
                      <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Имя мастера</th>
                      <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Города</th>
                      <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Общая сумма</th>
                      <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Заказы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMasters.map((master) => (
                      <tr
                        key={master.id}
                        className={`cursor-pointer transition-colors ${
                          isDark ? 'border-b border-white/10 hover:bg-white/[0.04]' : 'border-b border-black/10 hover:bg-black/[0.02]'
                        }`}
                        onClick={() => handleMasterClick(master.id)}
                      >
                        <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{master.name}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{master.cities?.join(', ') || '—'}</td>
                        <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-[#0a4f42]'}`}>{master.totalAmount.toLocaleString()} ₽</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium ${
                            master.ordersCount > 0
                              ? (isDark ? 'bg-white/[0.1] text-white' : 'bg-[#0a4f42] text-white')
                              : isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-black/[0.08] text-gray-600'
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

            {/* Мобильные карточки */}
            {filteredMasters.length > 0 && (
              <div className="md:hidden space-y-3">
                {filteredMasters.map((master) => (
                  <button
                    key={master.id}
                    onClick={() => handleMasterClick(master.id)}
                    className={`w-full text-left rounded-[20px] border p-4 transition-all ${
                      isDark ? 'bg-white/[0.02] border-white/10 hover:border-white/30' : 'bg-white border-black/10 hover:border-black/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{master.name}</p>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{master.cities?.join(', ') || '—'}</p>
                      </div>
                      <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium ${
                        master.ordersCount > 0
                          ? (isDark ? 'bg-white/[0.1] text-white' : 'bg-[#0a4f42] text-white')
                          : isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-black/[0.08] text-gray-600'
                      }`}>
                        {master.ordersCount}
                      </span>
                    </div>
                    <p className={`mt-3 text-base font-semibold ${isDark ? 'text-white' : 'text-[#0a4f42]'}`}>
                      {master.totalAmount.toLocaleString()} ₽
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Нет данных */}
            {filteredMasters.length === 0 && (
              <div className={`rounded-[20px] border py-16 text-center ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
              }`}>
                <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  Нет данных для отображения
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MasterHandoverPage() {
  return <MasterHandoverContent />
}
