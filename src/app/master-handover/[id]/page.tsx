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
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
              <div className="text-center py-8 animate-fade-in">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="text-gray-700 text-lg mt-4">Загрузка данных...</p>
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
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 animate-slide-in-left">
                <p className="text-red-600">{error}</p>
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
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
              <p className="text-gray-700 text-center animate-fade-in">Мастер не найден</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Кнопка назад */}
            <div className="mb-4 animate-slide-in-left">
              <Button
                onClick={handleBack}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-gray-800 rounded-lg hover:shadow-md transition-all duration-200"
              >
                ← Назад
              </Button>
            </div>

            {/* Заголовок */}
            <div className="mb-6 animate-slide-down">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {masterData.name}
              </h1>
              <p className="text-gray-600">{masterData.cities?.join(', ') || 'Не указано'}</p>
            </div>

            {/* Список заказов */}
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8 animate-fade-in font-medium">Нет заказов для сдачи</p>
            ) : (
              <div className="space-y-3">
                {Array.isArray(orders) && orders.map((order: any) => (
                  <div 
                    key={order.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in"
                  >
                    <div className="space-y-3 md:space-y-0">
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 flex-1">
                          <div>
                            <p className="text-gray-600 text-xs">ID заказа</p>
                            <p className="text-gray-800 font-semibold text-sm">#{order.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Адрес</p>
                            <p className="text-gray-800 text-sm">{order.address || 'Не указан'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Проблема</p>
                            <p className="text-gray-800 text-sm">{order.problem || 'Не указана'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Сумма сдачи</p>
                            <p className="text-gray-800 text-lg font-bold">{order.masterChange?.toLocaleString() || 0} ₽</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Статус сдачи</p>
                            <p className="text-gray-800 text-sm">
                              {order.cashSubmissionStatus === 'На проверке' && 'На проверке'}
                              {order.cashSubmissionStatus === 'Одобрено' && 'Одобрено'}
                              {order.cashSubmissionStatus === 'Отклонено' && 'Отклонено'}
                              {!order.cashSubmissionStatus && order.statusOrder === 'Готово' && 'Готово'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Чек перевода</p>
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
                              className="py-2 px-4 text-sm rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-md transition-all duration-200"
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
                            className="flex-1 py-2 px-4 text-sm rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-md transition-all duration-200"
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
