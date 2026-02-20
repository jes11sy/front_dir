"use client"

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, Order, Master, Call } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { StatusSelect } from '@/components/orders/StatusSelect'
import { logger } from '@/lib/logger'
import { useOrder, useOrderCalls } from '@/hooks/useOrder'
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import { OrderMasterTab } from '@/components/orders/OrderMasterTab'
import { OrderMultipleFileUpload } from '@/components/orders/OrderMultipleFileUpload'
import { OrderInfoTabContent } from '@/components/orders/OrderInfoTabContent'
import { OrderCallsTab } from '@/components/orders/OrderCallsTab'
import { useDesignStore } from '@/store/design.store'

function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('main')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [callsLoaded, setCallsLoaded] = useState(false)
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
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
  
  // Файлы документов через хуки (множественная загрузка до 10 файлов)
  const bsoUpload = useMultipleFileUpload(10)
  const expenditureUpload = useMultipleFileUpload(10)

  const tabs = [
    { id: 'main', label: 'Информация' },
    { id: 'result', label: 'Мастер' },
    { id: 'chat', label: 'История' }
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
        
        // Сдача мастера зависит от суммы
        // До 5000 - 60%, выше 5000 - 50%
        const masterPercent = resultAmount <= 5000 ? 0.6 : 0.5
        const masterChangeAmount = cleanAmount * masterPercent
        
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
        try {
          setDateClosmod(order.dateClosmod ? new Date(order.dateClosmod).toISOString().split('T')[0] : '')
        } catch {
          setDateClosmod('')
        }
        
        // Строим прямые URL для существующих файлов в S3 (публичный доступ)
        // Фильтруем null, undefined и пустые строки для избежания ошибки "The string did not match the expected pattern"
        const S3_BASE_URL = 'https://s3.twcstorage.ru/f7eead03-crmfiles'
        
        if (order.bsoDoc && Array.isArray(order.bsoDoc)) {
          const bsoUrls = order.bsoDoc
            .filter((doc): doc is string => !!doc && typeof doc === 'string' && doc.trim() !== '')
            .map(doc => doc.startsWith('http') ? doc : `${S3_BASE_URL}/${doc}`)
          if (bsoUrls.length > 0) {
          bsoUpload.setExistingPreviews(bsoUrls)
        }
        }
        if (order.expenditureDoc && Array.isArray(order.expenditureDoc)) {
          const expenditureUrls = order.expenditureDoc
            .filter((doc): doc is string => !!doc && typeof doc === 'string' && doc.trim() !== '')
            .map(doc => doc.startsWith('http') ? doc : `${S3_BASE_URL}/${doc}`)
          if (expenditureUrls.length > 0) {
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

  // Загружаем звонки при открытии таба "Запись/История"
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
      // БД теперь хранит массивы напрямую (String[])
      let bsoDocPaths: string[] = []
      let expenditureDocPaths: string[] = []

      // Загружаем новые BSO файлы (только те, у которых есть объект File)
      const newBsoFiles = bsoUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newBsoFiles.length > 0) {
        try {
          const bsoResults = await Promise.all(
            newBsoFiles.map(file => apiClient.uploadOrderBso(file))
          )
          const newBsoPaths = bsoResults.map(res => res.filePath)
          
          // Получаем существующие пути из файлов без объекта File (уже загруженные ранее)
          const existingBsoPaths = bsoUpload.files
            .filter(f => f.file === null)
            .map(f => f.preview)
          
          bsoDocPaths = [...existingBsoPaths, ...newBsoPaths]
        } catch (uploadError) {
          logger.error('Error uploading BSO', uploadError)
          return
        }
      } else {
        // Только существующие файлы
        bsoDocPaths = bsoUpload.files
          .filter(f => f.file === null)
          .map(f => f.preview)
      }

      // Загружаем новые файлы расходов (только те, у которых есть объект File)
      const newExpenditureFiles = expenditureUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newExpenditureFiles.length > 0) {
        try {
          const expenditureResults = await Promise.all(
            newExpenditureFiles.map(file => apiClient.uploadOrderExpenditure(file))
          )
          const newExpenditurePaths = expenditureResults.map(res => res.filePath)
          
          // Получаем существующие пути
          const existingExpenditurePaths = expenditureUpload.files
            .filter(f => f.file === null)
            .map(f => f.preview)
          
          expenditureDocPaths = [...existingExpenditurePaths, ...newExpenditurePaths]
        } catch (uploadError) {
          logger.error('Error uploading expenditure doc', uploadError)
          return
        }
      } else {
        // Только существующие файлы
        expenditureDocPaths = expenditureUpload.files
          .filter(f => f.file === null)
          .map(f => f.preview)
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
        dateClosmod: dateClosmod && dateClosmod.trim() !== '' ? (() => {
          try {
            return new Date(dateClosmod).toISOString()
          } catch {
            return undefined
          }
        })() : undefined,
        bsoDoc: bsoDocPaths,
        expenditureDoc: expenditureDocPaths,
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

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Готово': return 'bg-emerald-100 text-emerald-700'
      case 'Отказ': return 'bg-red-100 text-red-700'
      case 'Незаказ': return 'bg-orange-100 text-orange-700'
      case 'В работе': return 'bg-blue-100 text-blue-700'
      case 'Модерн': return 'bg-purple-100 text-purple-700'
      case 'В пути': return 'bg-cyan-100 text-cyan-700'
      case 'Принял': return 'bg-teal-100 text-teal-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 min-h-screen ${isDark ? 'bg-[#1e2530]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка заказа...</span>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={`min-h-screen p-4 ${isDark ? 'bg-[#1e2530]' : 'bg-gray-50'}`}>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
          <p className={isDark ? 'text-red-400 text-sm' : 'text-red-600 text-sm'}>{error instanceof Error ? error.message : error || 'Заказ не найден'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 transition-colors duration-300 ${
      isDark ? 'bg-[#1e2530]' : 'bg-gray-50'
    }`}>
      {/* Шапка заказа */}
      <div className={`rounded-b-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b relative ${
          isDark ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-[#3a4451]' : 'hover:bg-gray-100'
              }`}
            >
              <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Заказ #{resolvedParams.id}</h1>
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
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Сохранение...</span>
              </>
            ) : isFieldsDisabled() ? 'Завершен' : 'Сохранить'}
          </button>
        </div>

        {/* Компактные табы */}
        <div className={`flex border-b ${
          isDark ? 'border-gray-700 bg-[#3a4451]/50' : 'border-gray-100 bg-gray-50/50'
        }`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-teal-500'
                  : isDark 
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className={`rounded-xl p-3 ${
          isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={isDark ? 'text-red-400 text-sm' : 'text-red-600 text-sm'}>{(error as Error).message || String(error)}</p>
        </div>
      )}

      {/* Содержимое вкладок */}
      {!loading && !error && order && (
        <>
          {activeTab === 'main' && (
            <div className="space-y-4">
              {/* Блок: Заказ */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказ</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.typeOrder || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>РК</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.rk || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Источник</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.avitoName || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Направление</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.typeEquipment || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Клиент */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.city || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Адрес</div>
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-800'}`} title={order.address}>{order.address || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Имя</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Телефон</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.phone || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Детали */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Детали</h3>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата встречи</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {order.dateMeeting ? new Date(order.dateMeeting).toLocaleDateString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
                      }) : '-'}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Проблема</div>
                    <div className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.problem || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div className="space-y-4">
              <OrderMasterTab
                orderStatus={orderStatus}
                selectedMaster={selectedMaster}
                setSelectedMaster={setSelectedMaster}
                masters={masters}
                isPartner={false}
                setIsPartner={() => {}}
                partnerPercent=""
                setPartnerPercent={() => {}}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </div>
          )}

          {activeTab === 'chat' && (
            <OrderCallsTab
              order={order}
              calls={calls}
              callsLoading={callsLoading}
              callsError={callsError ? (callsError instanceof Error ? callsError.message : String(callsError)) : null}
            />
          )}
        </>
      )}
      
      {/* Кнопка Сохранить для мобильных */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <button 
          onClick={handleSave}
          disabled={updating || isFieldsDisabled()}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? 'Сохранение...' : isFieldsDisabled() ? 'Заказ завершен' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailContent params={params} />
}
