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
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import { OrderMasterTab } from '@/components/orders/OrderMasterTab'
import { OrderMultipleFileUpload } from '@/components/orders/OrderMultipleFileUpload'
import { OrderInfoTabContent } from '@/components/orders/OrderInfoTabContent'
import { OrderPageStyles } from '@/components/orders/OrderPageStyles'
import { OrderCallsTab } from '@/components/orders/OrderCallsTab'

function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('main')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [callsLoaded, setCallsLoaded] = useState(false)
  
  // Используем хуки для загрузки данных
  const { order, masters, loading, error, updating, updateOrder } = useOrder(resolvedParams.id)
  const { calls, loading: callsLoading, error: callsError, loadCalls } = useOrderCalls(resolvedParams.id)
  
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
  
  // Состояние для партнера
  const [isPartner, setIsPartner] = useState<boolean>(false)
  const [partnerPercent, setPartnerPercent] = useState<string>('')
  
  // Файлы документов через хуки (множественная загрузка до 10 файлов)
  const bsoUpload = useMultipleFileUpload(10)
  const expenditureUpload = useMultipleFileUpload(10)

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
        
        // Расчет сдачи мастера с учетом партнерства
        let masterChangeAmount
        if (isPartner && partnerPercent && partnerPercent.trim() !== '') {
          // Если партнер, то: Сдача мастера = Чистыми * (100% - % партнера)
          const partnerPercentValue = Number(partnerPercent)
          masterChangeAmount = cleanAmount * (100 - partnerPercentValue) / 100
        } else {
          // Иначе: Сдача мастера зависит от суммы
          // До 5000 - 60%, выше 5000 - 50%
          const masterPercent = resultAmount <= 5000 ? 0.6 : 0.5
          masterChangeAmount = cleanAmount * masterPercent
        }
        
        setClean(cleanAmount.toString())
        setMasterChange(masterChangeAmount.toString())
      }
    }
  }, [result, expenditure, orderStatus, isPartner, partnerPercent])


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
        setIsPartner(order.partner || false)
        setPartnerPercent(order.partnerPercent?.toString() || '')
        
        // Загружаем подписанные URL для существующих файлов
        // Предполагаем что в БД хранится массив путей через запятую или JSON
        if (order.bsoDoc) {
          try {
            // Пытаемся распарсить как JSON массив
            const bsoDocs = JSON.parse(order.bsoDoc)
            if (Array.isArray(bsoDocs)) {
              const bsoUrls = await Promise.all(bsoDocs.map(doc => getSignedUrl(doc)))
              bsoUpload.setExistingPreviews(bsoUrls)
            } else {
              // Если не массив, то один документ
              const bsoUrl = await getSignedUrl(order.bsoDoc)
              bsoUpload.setExistingPreviews([bsoUrl])
            }
          } catch {
            // Если не JSON, возможно разделенные запятой или один файл
            const bsoDocs = order.bsoDoc.includes(',') ? order.bsoDoc.split(',') : [order.bsoDoc]
            const bsoUrls = await Promise.all(bsoDocs.map(doc => getSignedUrl(doc.trim())))
            bsoUpload.setExistingPreviews(bsoUrls)
          }
        }
        if (order.expenditureDoc) {
          try {
            const expenditureDocs = JSON.parse(order.expenditureDoc)
            if (Array.isArray(expenditureDocs)) {
              const expenditureUrls = await Promise.all(expenditureDocs.map(doc => getSignedUrl(doc)))
              expenditureUpload.setExistingPreviews(expenditureUrls)
            } else {
              const expenditureUrl = await getSignedUrl(order.expenditureDoc)
              expenditureUpload.setExistingPreviews([expenditureUrl])
            }
          } catch {
            const expenditureDocs = order.expenditureDoc.includes(',') ? order.expenditureDoc.split(',') : [order.expenditureDoc]
            const expenditureUrls = await Promise.all(expenditureDocs.map(doc => getSignedUrl(doc.trim())))
            expenditureUpload.setExistingPreviews(expenditureUrls)
          }
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
    if (activeTab === 'chat' && !callsLoading && !callsLoaded) {
      setCallsLoaded(true)
      // Проверяем, есть ли API для звонков
      loadCalls().catch((error) => {
        logger.warn('Calls API not available:', error.message)
      })
    }
  }, [activeTab, callsLoading, callsLoaded, loadCalls])

  // Функция для сохранения изменений
  const handleSave = async () => {
    if (!order) return
    
    try {
      
      // Загружаем файлы в S3 если они есть (множественная загрузка)
      let bsoDocPath = order.bsoDoc
      let expenditureDocPath = order.expenditureDoc

      // Загружаем новые BSO файлы (только те, у которых есть объект File)
      const newBsoFiles = bsoUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newBsoFiles.length > 0) {
        try {
          const bsoResults = await Promise.all(
            newBsoFiles.map(file => apiClient.uploadOrderBso(file))
          )
          const bsoPaths = bsoResults.map(res => res.filePath)
          
          // Объединяем с существующими путями если есть
          const existingBsoPaths: string[] = []
          if (order.bsoDoc) {
            try {
              const parsed = JSON.parse(order.bsoDoc)
              if (Array.isArray(parsed)) existingBsoPaths.push(...parsed)
              else existingBsoPaths.push(order.bsoDoc)
            } catch {
              existingBsoPaths.push(...order.bsoDoc.split(',').map(p => p.trim()))
            }
          }
          
          const allBsoPaths = [...existingBsoPaths, ...bsoPaths]
          bsoDocPath = JSON.stringify(allBsoPaths)
        } catch (uploadError) {
          logger.error('Error uploading BSO', uploadError)
          return
        }
      } else if (bsoUpload.files.length === 0) {
        // Если нет файлов вообще, значит все удалили
        bsoDocPath = null
      } else {
        // Есть только существующие файлы - сохраняем их
        const existingBsoPaths = bsoUpload.files.filter(f => f.file === null).map(f => f.preview);
        bsoDocPath = existingBsoPaths.length > 0 ? JSON.stringify(existingBsoPaths) : null;
      }

      // Загружаем новые файлы расходов (только те, у которых есть объект File)
      const newExpenditureFiles = expenditureUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newExpenditureFiles.length > 0) {
        try {
          const expenditureResults = await Promise.all(
            newExpenditureFiles.map(file => apiClient.uploadOrderExpenditure(file))
          )
          const expenditurePaths = expenditureResults.map(res => res.filePath)
          
          // Объединяем с существующими путями
          const existingExpenditurePaths: string[] = []
          if (order.expenditureDoc) {
            try {
              const parsed = JSON.parse(order.expenditureDoc)
              if (Array.isArray(parsed)) existingExpenditurePaths.push(...parsed)
              else existingExpenditurePaths.push(order.expenditureDoc)
            } catch {
              existingExpenditurePaths.push(...order.expenditureDoc.split(',').map(p => p.trim()))
            }
          }
          
          const allExpenditurePaths = [...existingExpenditurePaths, ...expenditurePaths]
          expenditureDocPath = JSON.stringify(allExpenditurePaths)
        } catch (uploadError) {
          logger.error('Error uploading expenditure doc', uploadError)
          return
        }
      } else if (expenditureUpload.files.length === 0) {
        expenditureDocPath = null
      } else {
        // Есть только существующие файлы - сохраняем их
        const existingExpenditurePaths = expenditureUpload.files.filter(f => f.file === null).map(f => f.preview);
        expenditureDocPath = existingExpenditurePaths.length > 0 ? JSON.stringify(existingExpenditurePaths) : null;
      }
      
      const updateData: Partial<Order> = {
        statusOrder: orderStatus,
        masterId: selectedMaster ? Number(selectedMaster) : undefined,
        partner: isPartner,
        partnerPercent: partnerPercent && partnerPercent.trim() !== '' ? Number(partnerPercent) : undefined,
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
      
      // После сохранения перезагружаем страницу для обновления данных
      // Данные обновятся в useEffect при загрузке заказа
      
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

            {/* Состояние загрузки - встроено выше в главной логике */}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-in-left">
                <p className="text-red-600">{(error as Error).message || String(error)}</p>
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
                    isPartner={isPartner}
                    setIsPartner={setIsPartner}
                    partnerPercent={partnerPercent}
                    setPartnerPercent={setPartnerPercent}
                    result={result}
                    setResult={setResult}
                    expenditure={expenditure}
                    setExpenditure={setExpenditure}
                    clean={clean}
                    setClean={setClean}
                    masterChange={masterChange}
                    setMasterChange={setMasterChange}
                    comment={comment}
                    setComment={setComment}
                    prepayment={prepayment}
                    setPrepayment={setPrepayment}
                    dateClosmod={dateClosmod}
                    setDateClosmod={setDateClosmod}
                    isFieldsDisabled={isFieldsDisabled}
                    shouldHideFinancialFields={shouldHideFinancialFields}
                    openSelect={openSelect}
                    setOpenSelect={setOpenSelect}
                  />
                  
                  {/* Поля "Документ" и "Чек" - множественная загрузка */}
                  {!shouldHideFinancialFields() && orderStatus !== 'Модерн' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <OrderMultipleFileUpload
                        label="Документ БСО"
                        filesWithPreviews={bsoUpload.files}
                        dragOver={bsoUpload.dragOver}
                        setDragOver={bsoUpload.setDragOver}
                        handleFiles={bsoUpload.handleFiles}
                        removeFile={bsoUpload.removeFile}
                        isFieldsDisabled={isFieldsDisabled}
                        canAddMore={bsoUpload.canAddMore}
                      />
                      <OrderMultipleFileUpload
                        label="Чеки расходов"
                        filesWithPreviews={expenditureUpload.files}
                        dragOver={expenditureUpload.dragOver}
                        setDragOver={expenditureUpload.setDragOver}
                        handleFiles={expenditureUpload.handleFiles}
                        removeFile={expenditureUpload.removeFile}
                        isFieldsDisabled={isFieldsDisabled}
                        canAddMore={expenditureUpload.canAddMore}
                      />
                    </div>
                      )}
                    </>
              )}

              {activeTab === 'chat' && (
                <OrderCallsTab
                  order={order}
                  calls={calls}
                  callsLoading={callsLoading}
                  callsError={callsError ? (callsError instanceof Error ? callsError.message : String(callsError)) : null}
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
