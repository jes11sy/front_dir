"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from '@/components/ui/toast'
import { useDesignStore } from '@/store/design.store'
import { ArrowLeft } from 'lucide-react'

function MasterHandoverDetailContent() {
  const router = useRouter()
  const params = useParams()
  const masterId = params.id as string
  const { theme } = useDesignStore()

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
        theme === 'dark' ? 'bg-[#1e2530]' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-10 w-10 border-2 mx-auto mb-3 ${
            theme === 'dark' ? 'border-[#0d5c4b] border-t-transparent' : 'border-[#0d5c4b] border-t-transparent'
          }`}></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen p-4 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1e2530]' : 'bg-gray-50'
      }`}>
        <div className={`rounded-lg p-4 ${
          theme === 'dark' ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{error}</p>
        </div>
      </div>
    )
  }

  if (!masterData) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1e2530]' : 'bg-gray-50'
      }`}>
        <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Мастер не найден</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#1e2530]' : 'bg-gray-50'
    }`}>
      {/* Шапка с кнопкой назад и именем мастера */}
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-4 ${
        theme === 'dark' ? 'bg-[#2a3441] border-b border-[#0d5c4b]/30' : 'bg-white border-b border-gray-200'
      }`}>
        <button
          onClick={handleBack}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'hover:bg-[#1e2530] text-gray-400 hover:text-[#0d5c4b]' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-[#0d5c4b]'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            {masterData.name}
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {masterData.cities?.join(', ') || '—'}
          </p>
        </div>
      </div>

      {/* Таблица заказов */}
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
            Нет заказов для сдачи
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[800px]">
            <thead className={theme === 'dark' ? 'bg-[#2a3441]' : 'bg-white'}>
              <tr className={theme === 'dark' ? 'border-b border-[#0d5c4b]/30' : 'border-b border-gray-200'}>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Проблема</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Итог</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Сдача</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Статус</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Чек</th>
                <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr 
                  key={order.id}
                  className={`transition-colors duration-150 ${
                    theme === 'dark' 
                      ? 'border-b border-[#0d5c4b]/20 hover:bg-[#2a3441]' 
                      : 'border-b border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <td className={`py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    #{order.id}
                  </td>
                  <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {order.address || '—'}
                  </td>
                  <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {order.problem || '—'}
                  </td>
                  <td className={`py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {order.result?.toLocaleString() || 0} ₽
                  </td>
                  <td className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-[#0d5c4b]'}`}>
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
                        className={`text-sm underline ${
                          theme === 'dark' ? 'text-[#0d5c4b] hover:text-[#0a4a3c]' : 'text-[#0d5c4b] hover:text-[#0a4a3c]'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Открыть
                      </a>
                    ) : (
                      <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {(order.cashSubmissionStatus === 'На проверке' || order.cashSubmissionStatus === 'Не отправлено') && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleApproveRequest(order.id, e)}
                          className="py-1 px-3 text-xs rounded-md bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white transition-colors font-medium"
                        >
                          Да
                        </button>
                        <button
                          onClick={(e) => handleRejectRequest(order.id, e)}
                          className="py-1 px-3 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
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
  )
}

export default function MasterHandoverDetailPage() {
  return <MasterHandoverDetailContent />
}
