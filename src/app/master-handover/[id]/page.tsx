"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import AuthGuard from "@/components/auth-guard"
import { logger } from '@/lib/logger'
import { toast } from '@/components/ui/toast'

function MasterHandoverDetailContent() {
  const router = useRouter()
  const params = useParams()
  const masterId = params.id as string

  const [masterData, setMasterData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getMasterHandoverDetails(Number(masterId))
        setMasterData(data.master)
        setOrders(data.orders)
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

  const handleApproveRequest = async (orderId: number) => {
    try {
      await apiClient.approveMasterHandover(orderId)
      // Обновляем данные после одобрения
      const data = await apiClient.getMasterHandoverDetails(Number(masterId))
      setOrders(data.orders)
    } catch (err) {
      logger.error('Error approving handover', err)
      toast.error('Ошибка при одобрении сдачи')
    }
  }

  const handleRejectRequest = async (orderId: number) => {
    try {
      await apiClient.rejectMasterHandover(orderId)
      // Обновляем данные после отклонения
      const data = await apiClient.getMasterHandoverDetails(Number(masterId))
      setOrders(data.orders)
    } catch (err) {
      logger.error('Error rejecting handover', err)
      toast.error('Ошибка при отклонении сдачи')
    }
  }

  const handleBack = () => {
    router.push('/master-handover')
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Загрузка данных...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!masterData) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
              <p className="text-white text-center">Мастер не найден</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Кнопка назад */}
            <div className="mb-4">
              <Button
                onClick={handleBack}
                className="px-4 py-2"
                style={{backgroundColor: '#2a6b68', color: 'white'}}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
              >
                ← Назад
              </Button>
            </div>

            {/* Заголовок */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                {masterData.name}
              </h1>
              <p className="text-gray-300">{masterData.cities?.join(', ') || 'Не указано'}</p>
            </div>

            {/* Список заказов */}
            {orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет заказов для сдачи</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <div 
                    key={order.id}
                    className="bg-gray-800 rounded p-3 border" 
                    style={{borderColor: '#4b5563'}}
                  >
                    <div className="space-y-3 md:space-y-0">
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 flex-1">
                          <div>
                            <p className="text-gray-400 text-xs">ID заказа</p>
                            <p className="text-white font-semibold text-sm">#{order.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Адрес</p>
                            <p className="text-white text-sm">{order.address || 'Не указан'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Проблема</p>
                            <p className="text-white text-sm">{order.problem || 'Не указана'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Сумма сдачи</p>
                            <p className="text-white text-lg font-bold">{order.masterChange?.toLocaleString() || 0} ₽</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Статус сдачи</p>
                            <p className="text-white text-sm">
                              {order.cashSubmissionStatus === 'На проверке' && 'На проверке'}
                              {order.cashSubmissionStatus === 'Одобрено' && 'Одобрено'}
                              {order.cashSubmissionStatus === 'Отклонено' && 'Отклонено'}
                              {!order.cashSubmissionStatus && order.statusOrder === 'Готово' && 'Готово'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Чек перевода</p>
                            {order.cashReceiptDoc ? (
                              <button 
                                className="text-blue-400 hover:text-blue-300 text-sm underline cursor-pointer"
                                onClick={() => {
                                  // Логика открытия чека
                                }}
                              >
                                {order.cashReceiptDoc}
                              </button>
                            ) : (
                              <p className="text-gray-500 text-sm">Нет чека</p>
                            )}
                          </div>
                        </div>
                        
                        {(order.statusOrder === 'Готово' && 
                          order.cashSubmissionStatus === 'На проверке' &&
                          order.cashSubmissionStatus !== 'Отклонено') && (
                          <div className="hidden md:flex gap-2 ml-4">
                            <button
                              onClick={() => handleApproveRequest(order.id)}
                              className="py-1 px-3 text-xs rounded border transition-colors"
                              style={{backgroundColor: '#2a6b68', borderColor: '#2a6b68', color: 'white'}}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                            >
                              ✓ Принять
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {(order.statusOrder === 'Готово' && 
                        order.cashSubmissionStatus === 'На проверке' &&
                        order.cashSubmissionStatus !== 'Отклонено') && (
                        <div className="flex gap-2 md:hidden">
                          <button
                            onClick={() => handleApproveRequest(order.id)}
                            className="flex-1 py-1 px-3 text-xs rounded border transition-colors"
                            style={{backgroundColor: '#2a6b68', borderColor: '#2a6b68', color: 'white'}}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                          >
                            ✓ Принять
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default function MasterHandoverDetailPage() {
  return (
    <AuthGuard>
      <MasterHandoverDetailContent />
    </AuthGuard>
  )
}
