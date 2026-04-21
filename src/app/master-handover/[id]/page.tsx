"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from '@/components/ui/toast'
import { useDesignStore } from '@/store/design.store'
import { ArrowLeft } from 'lucide-react'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'

function MasterHandoverDetailContent() {
  const router = useRouter()
  const params = useParams()
  const masterId = params.id as string
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [masterData, setMasterData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Функция для получения прямой ссылки на файл в S3
  const getS3Url = (filePath: string | null | undefined): string | null => {
    if (!filePath) return null
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath
    }
    return `https://s3.timeweb.com/f7eead03-crmfiles/${filePath}`
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getMasterHandoverDetails(Number(masterId))
        setMasterData(data.master)
        setOrders(Array.isArray(data.orders) ? data.orders : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
        logger.error('Error loading master handover details', err)
      } finally {
        setLoading(false)
      }
    }

    if (masterId) {
      loadData()
    }
  }, [masterId])

  const handleApproveRequest = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await apiClient.approveMasterHandover(orderId)
      const data = await apiClient.getMasterHandoverDetails(Number(masterId))
      setOrders(data.orders)
      toast.success('Сдача одобрена')
    } catch (err) {
      logger.error('Error approving handover', err)
      toast.error('Ошибка при одобрении сдачи')
    }
  }

  const handleRejectRequest = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await apiClient.rejectMasterHandover(orderId)
      const data = await apiClient.getMasterHandoverDetails(Number(masterId))
      setOrders(data.orders)
      toast.success('Сдача отклонена')
    } catch (err) {
      logger.error('Error rejecting handover', err)
      toast.error('Ошибка при отклонении сдачи')
    }
  }

  const handleBack = () => {
    router.push('/master-handover')
  }

  // Получение цвета статуса
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Одобрено':
        return theme === 'dark' 
          ? 'bg-green-900/40 text-green-400' 
          : 'bg-green-100 text-green-700'
      case 'На проверке':
        return theme === 'dark' 
          ? 'bg-yellow-900/40 text-yellow-400' 
          : 'bg-yellow-100 text-yellow-700'
      case 'Отклонено':
        return theme === 'dark' 
          ? 'bg-red-900/40 text-red-400' 
          : 'bg-red-100 text-red-700'
      default:
        return theme === 'dark' 
          ? 'bg-gray-700 text-gray-400' 
          : 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
      }`}>
        <LoadingState isDark={isDark} message="Загрузка сдач мастера..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen px-4 py-6 transition-colors duration-300 ${
        isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
      }`}>
        <NetworkError
          isDark={isDark}
          onRetry={() => window.location.reload()}
          title="Ошибка загрузки"
          message={error}
          buttonText="Обновить"
        />
      </div>
    )
  }

  if (!masterData) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
      }`}>
        <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Мастер не найден</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className="px-4 py-6">
        {/* Шапка */}
        <div className={`mb-4 rounded-[20px] border px-4 py-4 ${
          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                isDark
                  ? 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#111113]'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {masterData.name}
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {masterData.cities?.join(', ') || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Таблица заказов */}
        {orders.length === 0 ? (
          <div className={`rounded-[20px] border py-16 text-center ${
            isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
          }`}>
            <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
              Нет заказов для сдачи
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className={`w-full border-collapse text-sm min-w-[800px] rounded-[20px] overflow-hidden ${
              isDark ? 'bg-white/[0.02] border border-white/10' : 'bg-white border border-black/10'
            }`}>
              <thead>
                <tr className={isDark ? 'border-b border-white/10 bg-white/[0.02]' : 'border-b border-black/10 bg-black/[0.02]'}>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Проблема</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Итог</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Сдача</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Чек</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className={`transition-colors ${
                      isDark ? 'border-b border-white/10 hover:bg-white/[0.04]' : 'border-b border-black/10 hover:bg-black/[0.02]'
                    }`}
                  >
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      #{order.id}
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.address || '—'}
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.problem || '—'}
                    </td>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {order.result?.toLocaleString() || 0} ₽
                    </td>
                    <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-[#0a4f42]'}`}>
                      {order.masterChange?.toLocaleString() || 0} ₽
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.cashSubmissionStatus)}`}>
                        {order.cashSubmissionStatus || 'Не указан'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {order.cashReceiptDoc ? (
                        <a
                          href={getS3Url(order.cashReceiptDoc) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm underline ${isDark ? 'text-white/80 hover:text-white' : 'text-[#0a4f42] hover:text-[#083f35]'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Открыть
                        </a>
                      ) : (
                        <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(order.cashSubmissionStatus === 'На проверке' || order.cashSubmissionStatus === 'Не отправлено') && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleApproveRequest(order.id, e)}
                            className={`py-1.5 px-3 text-xs rounded-lg transition-colors font-medium ${
                              isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] hover:bg-[#083f35] text-white'
                            }`}
                          >
                            Да
                          </button>
                          <button
                            onClick={(e) => handleRejectRequest(order.id, e)}
                            className="py-1.5 px-3 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
                          >
                            Нет
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default function MasterHandoverDetailPage() {
  return <MasterHandoverDetailContent />
}
