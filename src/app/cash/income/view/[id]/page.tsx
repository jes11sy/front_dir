"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from "@/components/auth-guard"
import { getSignedUrl } from '@/lib/s3-utils'
import { apiClient, CashTransaction } from '@/lib/api'

function IncomeViewContent() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<CashTransaction | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const transactionId = params.id as string

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Получаем все транзакции и находим нужную
        const transactions = await apiClient.getCashIncome()
        const foundTransaction = transactions.find(t => t.id === Number(transactionId))
        
        if (foundTransaction) {
          setTransaction(foundTransaction)
          
          // Загружаем подписанный URL для чека
          if (foundTransaction.receiptDoc) {
            const signedUrl = await getSignedUrl(foundTransaction.receiptDoc)
            setReceiptUrl(signedUrl)
          }
        } else {
          setError('Транзакция не найдена')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки транзакции')
      } finally {
        setLoading(false)
      }
    }

    if (transactionId) {
      loadTransaction()
    }
  }, [transactionId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'приход': return '#2a6b68'
      case 'расход': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">Ошибка: {error}</div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center">
          <div className="text-white text-lg mb-4">Транзакция не найдена</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-lg sm:rounded-2xl p-4 sm:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Информация о транзакции */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">ID:</span>
                <span className="text-gray-800 font-medium text-sm sm:text-base">{transaction.id}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Тип:</span>
                <span 
                  className="px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium text-white"
                  style={{backgroundColor: getTypeColor(transaction.name)}}
                >
                  {transaction.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Город:</span>
                <span className="text-gray-800 text-sm sm:text-base">{transaction.city || 'Не указан'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Сумма:</span>
                <span className="text-green-600 font-semibold text-sm sm:text-base">
                  {Number(transaction.amount).toLocaleString()} ₽
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Назначение платежа:</span>
                <span className="text-gray-800 text-sm sm:text-base text-right max-w-[50%]">{transaction.paymentPurpose || 'Не указано'}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm sm:text-base">Комментарий:</span>
                <span className="text-gray-800 text-right max-w-[50%] text-sm sm:text-base">
                  {transaction.note || 'Нет комментария'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Дата создания:</span>
                <span className="text-gray-800 text-sm sm:text-base">{formatDate(transaction.dateCreate)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">Создатель:</span>
                <span className="text-gray-800 text-sm sm:text-base text-right max-w-[50%]">{transaction.nameCreate || 'Не указан'}</span>
              </div>

              {transaction.receiptDoc && (
                <div>
                  
                  {(() => {
                    const fileName = transaction.receiptDoc.toLowerCase()
                    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.webp')
                    
                    if (isImage) {
                      return (
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 mt-3">
                          <div className="flex flex-col items-center">
                            <img 
                              src={receiptUrl || ''}
                              alt="Чек"
                              className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={async () => {
                                if (transaction.receiptDoc) {
                                  const signedUrl = await getSignedUrl(transaction.receiptDoc)
                                  window.open(signedUrl, '_blank')
                                }
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  // Безопасное создание DOM элементов вместо innerHTML
                                  const errorContainer = document.createElement('div')
                                  errorContainer.className = 'text-center py-4 sm:py-8'
                                  
                                  const errorMessage = document.createElement('div')
                                  errorMessage.className = 'text-gray-400 mb-2 text-sm sm:text-base'
                                  errorMessage.textContent = 'Не удалось загрузить изображение'
                                  
                                  const openButton = document.createElement('button')
                                  openButton.className = 'text-blue-400 hover:text-blue-300 underline text-sm sm:text-base'
                                  openButton.textContent = 'Открыть файл'
                                  openButton.addEventListener('click', async () => {
                                    try {
                                      if (!transaction.receiptDoc) return
                                      const signedUrl = await getSignedUrl(transaction.receiptDoc)
                                      window.open(signedUrl, '_blank')
                                    } catch (error) {
                                      console.error('Ошибка получения подписанного URL:', error)
                                      // Fallback на прямой URL
                                      const fallbackUrl = `${process.env.NEXT_PUBLIC_S3_BASE_URL || 'https://s3.twcstorage.ru/f7eead03-crmfiles'}/${transaction.receiptDoc}`
                                      window.open(fallbackUrl, '_blank')
                                    }
                                  })
                                  
                                  errorContainer.appendChild(errorMessage)
                                  errorContainer.appendChild(openButton)
                                  parent.appendChild(errorContainer)
                                }
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">Нажмите на изображение для открытия в новой вкладке</p>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 text-center border border-gray-200 mt-3">
                          <div className="text-gray-600 mb-4">
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div className="text-base sm:text-lg font-medium text-gray-800">Документ</div>
                            <div className="text-xs sm:text-sm text-gray-500">{transaction.receiptDoc.split('/').pop()}</div>
                          </div>
                          <button 
                            className="px-3 py-2 sm:px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm sm:text-base font-medium"
                            onClick={async () => {
                              if (transaction.receiptDoc) {
                                const signedUrl = await getSignedUrl(transaction.receiptDoc)
                                window.open(signedUrl, '_blank')
                              }
                            }}
                          >
                            Скачать документ
                          </button>
                        </div>
                      )
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IncomeViewPage() {
  return (
    <AuthGuard>
      <IncomeViewContent />
    </AuthGuard>
  )
}
