"use client"

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from "@/components/auth-guard"
import { apiClient, Order, Master, Call } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { StatusSelect } from '@/components/orders/StatusSelect'
import { getSignedUrl } from '@/lib/s3-utils'
import { logger } from '@/lib/logger'
import { useOrder, useOrderCalls } from '@/hooks/useOrder'
import { useFileUpload } from '@/hooks/useFileUpload'
import { OrderMasterTab } from '@/components/orders/OrderMasterTab'
import { OrderFileUpload } from '@/components/orders/OrderFileUpload'
import { OrderInfoTabContent } from '@/components/orders/OrderInfoTabContent'
import { OrderPageStyles } from '@/components/orders/OrderPageStyles'
import { OrderLoadingSpinner } from '@/components/orders/OrderLoadingSpinner'
import { OrderCallsTab } from '@/components/orders/OrderCallsTab'

function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('main')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  
  // Используем хуки для загрузки данных
  const { order, masters, loading, error, updating, updateOrder } = useOrder(resolvedParams.id)
  const { calls, loading: callsLoading, loadCalls } = useOrderCalls(resolvedParams.id)
  
  // Локальные состояния для полей формы
  const [orderStatus, setOrderStatus] = useState('in_work')
  const [selectedMaster, setSelectedMaster] = useState('')
  const [cashTransactionCreated, setCashTransactionCreated] = useState(false)
  
  // Состояние для полей формы
  const [result, setResult] = useState<string>('')
  const [expenditure, setExpenditure] = useState<string>('')
  const [clean, setClean] = useState<string>('')
  const [masterChange, setMasterChange] = useState<string>('')
  const [comment, setComment] = useState<string>('')
  const [prepayment, setPrepayment] = useState<string>('')
  const [dateClosmod, setDateClosmod] = useState<string>('')
  
  // Файлы документов через хуки
  const bsoUpload = useFileUpload()
  const expenditureUpload = useFileUpload()

  const tabs = [
    { id: 'main', label: 'Информация по заказу' },
    { id: 'result', label: 'Мастер' },
    { id: 'chat', label: 'Запись/Чат авито' }
  ]

  // Функция для проверки, заблокированы ли поля для редактирования
  const isFieldsDisabled = (): boolean => {
    // Блокируем поля только если статус в БД является финальным (не выбранный, а сохраненный)
    return !!(order && ['Готово', 'Отказ', 'Незаказ'].includes(order.statusOrder || ''))
  }

  // Функция для проверки, нужно ли скрывать поля итога, расхода, документа и чека
  const shouldHideFinancialFields = () => {
    return ['Ожидает', 'Принял', 'В пути'].includes(orderStatus)
  }

  // Автоматически устанавливаем итог и расход в 0 при статусах "Отказ" и "Незаказ"
  useEffect(() => {
    if (orderStatus === 'Отказ' || orderStatus === 'Незаказ') {
      setResult('0')
      setExpenditure('0')
    }
  }, [orderStatus])

  // Автоматически рассчитываем "Чистыми" и "Сдача мастера" при изменении "Итог" и "Расход"
  useEffect(() => {
    if (result && orderStatus === 'Готово') {
      const resultAmount = Number(result)
      const expenditureAmount = expenditure ? Number(expenditure) : 0
      
      if (resultAmount > 0) {
        const cleanAmount = resultAmount - expenditureAmount // Чистыми = Итог - Расход
        const masterChangeAmount = cleanAmount / 2 // Сдача мастера = Чистыми / 2
        
        setClean(cleanAmount.toString())
        setMasterChange(masterChangeAmount.toString())
      }
    }
  }, [result, expenditure, orderStatus])


  // Функция для получения доступных статусов в зависимости от текущего статуса
  const getAvailableStatuses = () => {
    if (orderStatus === 'Модерн') {
      return ['Модерн', 'Готово', 'Отказ', 'Незаказ']
    }
    if (orderStatus === 'Готово') {
      return ['Готово', 'Отказ', 'Незаказ']
    }
    if (orderStatus === 'Отказ') {
      return ['Отказ', 'Готово', 'Незаказ']
    }
    if (orderStatus === 'Незаказ') {
      return ['Незаказ', 'Готово', 'Отказ']
    }
    return ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ']
  }

  // Функции для работы с файлами через хуки
  const handleFile = (file: File, type: 'bso' | 'expenditure') => {
    if (type === 'bso') {
      bsoUpload.handleFile(file)
    } else {
      expenditureUpload.handleFile(file)
    }
  }

  const removeFile = (type: 'bso' | 'expenditure') => {
    if (type === 'bso') {
      bsoUpload.removeFile()
    } else {
      expenditureUpload.removeFile()
    }
  }


  // Синхронизация данных заказа с локальными состояниями формы
  useEffect(() => {
    if (order) {
      const loadDocuments = async () => {
        setOrderStatus(order.statusOrder || '')
        setResult(order.result?.toString() || '')
        setExpenditure(order.expenditure?.toString() || '')
        setClean(order.clean?.toString() || '')
        setMasterChange(order.masterChange?.toString() || '')
        setComment(order.comment || '')
        setPrepayment(order.prepayment?.toString() || '')
        setDateClosmod(order.dateClosmod ? new Date(order.dateClosmod).toISOString().split('T')[0] : '')
        
        // Загружаем подписанные URL для существующих файлов
        if (order.bsoDoc) {
          const bsoUrl = await getSignedUrl(order.bsoDoc)
          bsoUpload.setExistingPreview(bsoUrl)
        }
        if (order.expenditureDoc) {
          const expenditureUrl = await getSignedUrl(order.expenditureDoc)
          expenditureUpload.setExistingPreview(expenditureUrl)
        }
        
        // Устанавливаем выбранного мастера
        if (order.masterId) {
          setSelectedMaster(order.masterId.toString())
        }
      }
      
      loadDocuments()
    }
  }, [order])

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      bsoUpload.cleanup()
      expenditureUpload.cleanup()
    }
  }, [bsoUpload, expenditureUpload])

  // Загружаем звонки при открытии таба "Запись/Чат авито"
  useEffect(() => {
    if (activeTab === 'chat' && !callsLoading && calls.length === 0) {
      loadCalls()
    }
  }, [activeTab, callsLoading, calls.length, loadCalls])

  // Функция для сохранения изменений
  const handleSave = async () => {
    if (!order) return
    
    try {
      
      // Загружаем файлы в S3 если они есть
      let bsoDocPath = order.bsoDoc
      let expenditureDocPath = order.expenditureDoc

      if (bsoUpload.file) {
        try {
          const bsoResult = await apiClient.uploadOrderBso(bsoUpload.file)
          bsoDocPath = bsoResult.filePath
        } catch (uploadError) {
          logger.error('Error uploading BSO', uploadError)
          return
        }
      } else if (!bsoUpload.preview) {
        // Если файл был удален (нет ни нового файла, ни превью), обнуляем путь
        bsoDocPath = undefined
      }

      if (expenditureUpload.file) {
        try {
          const expenditureResult = await apiClient.uploadOrderExpenditure(expenditureUpload.file)
          expenditureDocPath = expenditureResult.filePath
        } catch (uploadError) {
          logger.error('Error uploading expenditure doc', uploadError)
          return
        }
      } else if (!expenditureUpload.preview) {
        // Если файл был удален (нет ни нового файла, ни превью), обнуляем путь
        expenditureDocPath = undefined
      }
      
      const updateData: Partial<Order> = {
        statusOrder: orderStatus,
        masterId: selectedMaster ? Number(selectedMaster) : undefined,
        result: result && result.trim() !== '' ? Number(result) : undefined,
        expenditure: expenditure && expenditure.trim() !== '' ? Number(expenditure) : undefined,
        clean: clean && clean.trim() !== '' ? Number(clean) : undefined,
        masterChange: masterChange && masterChange.trim() !== '' ? Number(masterChange) : undefined,
        comment: comment && comment.trim() !== '' ? comment : undefined,
        prepayment: prepayment && prepayment.trim() !== '' ? Number(prepayment) : undefined,
        dateClosmod: dateClosmod && dateClosmod.trim() !== '' ? new Date(dateClosmod).toISOString() : undefined,
        bsoDoc: bsoDocPath,
        expenditureDoc: expenditureDocPath,
      }
      
      await updateOrder(updateData)
      
      // Обновляем превью файлов после успешного сохранения (получаем подписанные URL)
      if (bsoDocPath) {
        const bsoUrl = await getSignedUrl(bsoDocPath)
        bsoUpload.setExistingPreview(bsoUrl)
      } else {
        bsoUpload.removeFile()
      }
      
      if (expenditureDocPath) {
        const expenditureUrl = await getSignedUrl(expenditureDocPath)
        expenditureUpload.setExistingPreview(expenditureUrl)
      } else {
        expenditureUpload.removeFile()
      }
      
      // Создаем или обновляем транзакцию в кассе при статусе "Готово" с заполненными данными
      if (orderStatus === 'Готово' && result && masterChange) {
        const resultAmount = Number(result)
        const expenditureAmount = expenditure ? Number(expenditure) : 0
        const masterChangeAmount = Number(masterChange)
        
        logger.debug('Handling cash transaction on save', { orderId: order.id })
        
        if (resultAmount > 0 && masterChangeAmount > 0) {
          try {
            // Проверяем, существует ли уже транзакция для этого заказа
            const existingTransaction = await apiClient.checkCashTransactionByOrder(order.id)
            
            if (existingTransaction) {
              // Обновляем существующую транзакцию
              await apiClient.updateCashTransactionByOrder(order.id, {
                name: 'приход',
                amount: masterChangeAmount,
                city: order.city,
                note: `Итог по заказу: ${resultAmount}₽`,
                paymentPurpose: `Заказ №${order.id}`
              })
              logger.debug('Cash transaction updated', { orderId: order.id })
            } else {
              // Создаем новую транзакцию
              await apiClient.createCashTransaction({
                name: 'приход',
                amount: masterChangeAmount,
                city: order.city,
                note: `Итог по заказу: ${resultAmount}₽`,
                paymentPurpose: `Заказ №${order.id}`
              })
              logger.debug('Cash transaction created', { orderId: order.id })
            }
          } catch (cashError) {
            logger.error('Error handling cash transaction', cashError)
            // Не прерываем сохранение заказа из-за ошибки cash
          }
        }
      }
      
      // Перезагружаем страницу после сохранения
      window.location.reload()
    } catch (err) {
      logger.error('Error saving order', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Загрузка данных заказа...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-in-left">
            <p className="text-red-600">{error instanceof Error ? error.message : error || 'Заказ не найден'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <OrderPageStyles />
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Навигация */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/orders')}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm sm:text-base font-medium"
              >
                ← Назад
              </button>
            </div>

            {/* Заголовок */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800 animate-slide-down">Заказ №{resolvedParams.id}</h1>
                  <StatusSelect
                    value={orderStatus}
                    onChange={setOrderStatus}
                    options={getAvailableStatuses().map(status => ({ value: status, label: status }))}
                    disabled={isFieldsDisabled()}
                    selectId="orderStatus"
                    openSelect={openSelect}
                    setOpenSelect={setOpenSelect}
                  />
                </div>
                <button 
                  onClick={handleSave}
                  disabled={updating || isFieldsDisabled()}
                  className="hidden md:block px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Сохранение...' : isFieldsDisabled() ? 'Заказ завершен' : 'Сохранить'}
                </button>
              </div>
            </div>

            {/* Вкладки */}
            <div className="border-b border-gray-200 mb-6 animate-fade-in">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-teal-600 border-teal-600'
                        : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-teal-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Состояние загрузки */}
            {loading && <OrderLoadingSpinner />}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-in-left">
                <p className="text-red-600">{error}</p>
              </div>
            )}


            {/* Содержимое вкладок */}
            {!loading && !error && order && (
            <div className="min-h-[400px]">
              {activeTab === 'main' && <OrderInfoTabContent order={order} />}

              {activeTab === 'result' && (
                <>
                  <OrderMasterTab
                    orderStatus={orderStatus}
                    selectedMaster={selectedMaster}
                    setSelectedMaster={setSelectedMaster}
                    masters={masters}
                    result={result}
                    setResult={setResult}
                    expenditure={expenditure}
                    setExpenditure={setExpenditure}
                    clean={clean}
                    masterChange={masterChange}
                    comment={comment}
                    setComment={setComment}
                    prepayment={prepayment}
                    setPrepayment={setPrepayment}
                    dateClosmod={dateClosmod}
                    setDateClosmod={setDateClosmod}
                    bsoFile={bsoUpload.file}
                    expenditureFile={expenditureUpload.file}
                    bsoPreview={bsoUpload.preview}
                    expenditurePreview={expenditureUpload.preview}
                    handleFile={handleFile}
                    removeFile={removeFile}
                    isFieldsDisabled={isFieldsDisabled}
                    shouldHideFinancialFields={shouldHideFinancialFields}
                    openSelect={openSelect}
                    setOpenSelect={setOpenSelect}
                    setBsoDragOver={bsoUpload.setDragOver}
                    setExpenditureDragOver={expenditureUpload.setDragOver}
                    bsoDragOver={bsoUpload.dragOver}
                    expenditureDragOver={expenditureUpload.dragOver}
                  />
                  
                  {/* Поля "Документ" и "Чек" */}
                  {!shouldHideFinancialFields() && orderStatus !== 'Модерн' && (
                    <OrderFileUpload
                      order={order}
                      bsoFile={bsoUpload.file}
                      expenditureFile={expenditureUpload.file}
                      bsoPreview={bsoUpload.preview}
                      expenditurePreview={expenditureUpload.preview}
                      handleFile={handleFile}
                      removeFile={removeFile}
                      isFieldsDisabled={isFieldsDisabled}
                      setBsoDragOver={bsoUpload.setDragOver}
                      setExpenditureDragOver={expenditureUpload.setDragOver}
                      bsoDragOver={bsoUpload.dragOver}
                      expenditureDragOver={expenditureUpload.dragOver}
                    />
                      )}
                    </>
              )}

              {activeTab === 'chat' && (
                <OrderCallsTab
                  order={order}
                  calls={calls}
                  callsLoading={callsLoading}
                />
              )}
            </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Кнопка Сохранить для мобильных */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 z-50">
        <div className="flex justify-center">
          <button 
            onClick={handleSave}
            disabled={updating || isFieldsDisabled()}
            className="px-8 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Сохранение...' : isFieldsDisabled() ? 'Заказ завершен' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthGuard>
      <OrderDetailContent params={params} />
    </AuthGuard>
  )
}
