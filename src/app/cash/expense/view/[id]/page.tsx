"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSignedUrl } from '@/lib/s3-utils'
import { apiClient, CashTransaction } from '@/lib/api'
import { Download } from 'lucide-react'

// Компонент для отображения одного чека
function ReceiptItem({ url, docPath, index }: { url: string; docPath: string; index: number }) {
  const fileName = docPath.toLowerCase()
  const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.webp')
  
  const handleOpen = () => {
    window.open(url, '_blank')
  }
  
  if (isImage) {
    return (
      <div className="relative group">
        <img 
          src={url}
          alt={`Чек ${index + 1}`}
          className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleOpen}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '' // Убираем битое изображение
            target.className = 'w-full h-24 sm:h-32 bg-gray-200 rounded-lg flex items-center justify-center'
          }}
        />
        <button
          onClick={handleOpen}
          className="absolute top-1 right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Открыть"
        >
          <Download className="w-3 h-3" />
        </button>
        <div className="text-xs text-gray-500 text-center mt-1 truncate">
          {docPath.split('/').pop()}
        </div>
      </div>
    )
  }
  
  // PDF или другой документ
  return (
    <div 
      className="relative group cursor-pointer"
      onClick={handleOpen}
    >
      <div className="w-full h-24 sm:h-32 bg-gray-200 rounded-lg flex flex-col items-center justify-center hover:bg-gray-300 transition-colors">
        <svg className="w-8 h-8 text-gray-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-gray-600">PDF</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleOpen()
        }}
        className="absolute top-1 right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        title="Скачать"
      >
        <Download className="w-3 h-3" />
      </button>
      <div className="text-xs text-gray-500 text-center mt-1 truncate">
        {docPath.split('/').pop()}
      </div>
    </div>
  )
}

function ExpenseViewContent() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<CashTransaction | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]) // Массив URL для receiptDocs

  const transactionId = params.id as string

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Получаем все транзакции и находим нужную
        const transactions = await apiClient.getCashExpense()
        const foundTransaction = transactions.find(t => t.id === Number(transactionId))
        
        if (foundTransaction) {
          setTransaction(foundTransaction)
          
          // Загружаем подписанный URL для одиночного чека (receiptDoc)
          if (foundTransaction.receiptDoc) {
            const signedUrl = await getSignedUrl(foundTransaction.receiptDoc)
            setReceiptUrl(signedUrl)
          }
          
          // Загружаем подписанные URL для массива чеков (receiptDocs)
          if (foundTransaction.receiptDocs && foundTransaction.receiptDocs.length > 0) {
            const urls = await Promise.all(
              foundTransaction.receiptDocs.map(doc => getSignedUrl(doc))
            )
            setReceiptUrls(urls)
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
                <span className="text-red-600 font-semibold text-sm sm:text-base">
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

              {/* Отображение чеков - поддержка receiptDoc (одиночный) и receiptDocs (массив) */}
              {(transaction.receiptDoc || (transaction.receiptDocs && transaction.receiptDocs.length > 0)) && (
                <div className="mt-4">
                  <div className="text-gray-600 text-sm sm:text-base mb-3 font-medium">
                    Чеки ({(transaction.receiptDocs?.length || 0) + (transaction.receiptDoc ? 1 : 0)})
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Одиночный чек (receiptDoc) - для обратной совместимости */}
                      {transaction.receiptDoc && receiptUrl && (
                        <ReceiptItem 
                          url={receiptUrl} 
                          docPath={transaction.receiptDoc} 
                          index={0}
                        />
                      )}
                      
                      {/* Массив чеков (receiptDocs) */}
                      {transaction.receiptDocs && receiptUrls.map((url, index) => (
                        <ReceiptItem 
                          key={index}
                          url={url} 
                          docPath={transaction.receiptDocs![index]} 
                          index={index + (transaction.receiptDoc ? 1 : 0)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExpenseViewPage() {
  return <ExpenseViewContent />
}
