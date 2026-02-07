"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, CashTransaction, CashStats } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import { X, Download, UploadCloud } from 'lucide-react'

function ExpenseContent() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expenseData, setExpenseData] = useState<CashTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  // 🔧 FIX: Сумма теперь приходит с сервера (агрегация через SQL)
  const [totalAmount, setTotalAmount] = useState(0)
  const itemsPerPage = 10
  const [openSelect, setOpenSelect] = useState<string | null>(null)

  // Состояние формы добавления расхода
  const [formData, setFormData] = useState({
    city: '',
    amount: '',
    purpose: '',
    comment: ''
  })
  
  // Хук для множественной загрузки чеков
  const {
    files: receiptFiles,
    dragOver,
    setDragOver,
    handleFiles: handleReceiptFiles,
    removeFile: removeReceiptFile,
    removeAllFiles: removeAllReceiptFiles,
    canAddMore: canAddMoreReceipts,
  } = useMultipleFileUpload(10) // Максимум 10 чеков
  
  // Состояние ошибки валидации чека
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Получаем города директора
  const currentUser = apiClient.getCurrentUser()
  const directorCities = currentUser?.cities || []
  
  // Данные для выпадающих списков
  const cities = directorCities.map(city => ({
    value: city.toLowerCase().replace(/\s+/g, '_'),
    label: city
  }))

  const purposes = [
    { value: 'avito', label: 'Авито' },
    { value: 'office', label: 'Офис' },
    { value: 'promoters', label: 'Промоутеры' },
    { value: 'leaflets', label: 'Листовки' },
    { value: 'collection', label: 'Инкасс' },
    { value: 'director_salary', label: 'Зарплата директора' },
    { value: 'other', label: 'Иное' }
  ]

  // 🔧 FIX: Загрузка данных с серверной пагинацией и агрегацией
  const loadExpenseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 🔧 FIX: Два легких параллельных запроса вместо одного тяжелого с limit=10000
      const [transactionsResult, statsResult] = await Promise.all([
        // Запрос транзакций с серверной пагинацией
        apiClient.getCashTransactionsPaginated({
          page: currentPage,
          limit: itemsPerPage,
          type: 'расход',
        }),
        // Запрос статистики (агрегация на сервере через SQL)
        apiClient.getCashStats({ type: 'расход' }),
      ])
      
      setExpenseData(transactionsResult.data)
      setTotalPages(transactionsResult.pagination.totalPages)
      // 🔧 FIX: Сумма считается на сервере - точно и быстро
      setTotalAmount(statsResult.totalExpense)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    loadExpenseData()
  }, [loadExpenseData])

  // Функции для работы с формой (мемоизированные)
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Обработка drag-over для чеков
  const handleReceiptDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [setDragOver])

  const handleReceiptDragLeave = useCallback(() => {
    setDragOver(false)
  }, [setDragOver])

  const handleReceiptDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    
    if (e.dataTransfer.files && canAddMoreReceipts) {
      handleReceiptFiles(e.dataTransfer.files)
      setReceiptError(null)
    }
  }, [handleReceiptFiles, canAddMoreReceipts, setDragOver])

  const handleReceiptInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && canAddMoreReceipts) {
      handleReceiptFiles(e.target.files)
      setReceiptError(null)
    }
  }, [handleReceiptFiles, canAddMoreReceipts])

  const handleSubmit = async () => {
    // Валидация: чек обязателен для расхода
    if (receiptFiles.length === 0) {
      setReceiptError('Для проведения расхода необходимо прикрепить хотя бы один чек')
      return
    }
    
    setIsSubmitting(true)
    setReceiptError(null)
    
    try {
      const cityName = cities.find(c => c.value === formData.city)?.label || directorCities[0] || 'Москва'
      const purposeName = purposes.find(p => p.value === formData.purpose)?.label || 'Иное'
      
      // Загружаем все чеки в S3 параллельно
      const uploadPromises = receiptFiles
        .filter(f => f.file) // Только новые файлы (не существующие)
        .map(f => apiClient.uploadReceipt(f.file!, 'cash'))
      
      const uploadResults = await Promise.all(uploadPromises)
      const receiptDocs = uploadResults.map(r => r.filePath)
      
      await apiClient.createCashTransaction({
        name: 'расход',
        amount: Number(formData.amount),
        city: cityName,
        note: formData.comment,
        paymentPurpose: purposeName,
        receiptDocs: receiptDocs // Массив чеков
      })
      
      setShowAddModal(false)
      setFormData({ city: '', amount: '', purpose: '', comment: '' })
      removeAllReceiptFiles() // Очищаем загруженные файлы
      await loadExpenseData() // Перезагружаем данные
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания расхода')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🔧 FIX: Данные уже пагинированы с сервера - не нужна клиентская пагинация
  const currentData = expenseData

  // Форматирование даты
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

  return (
    <div>
      {/* Состояние загрузки и ошибки */}
            {loading && (
              <div className="text-center py-8">
                <div className="text-white">Загрузка...</div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="text-red-400">Ошибка: {error}</div>
                <button 
                  onClick={loadExpenseData}
                  className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Фильтрация по дате */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h3 className="text-gray-700 font-semibold group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200 ${
                      showFilters ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                  style={{backgroundColor: '#ef4444'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  + Добавить расход
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">От даты</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">До даты</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                      >
                        Сбросить
                      </button>
                      <button 
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-md font-medium"
                      >
                        Применить
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Таблица */}
            {!loading && !error && (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
                <table className="w-full border-collapse text-[11px] min-w-[600px] bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Тип</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Назначение платежа</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Сумма</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Комментарий</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => {
                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case 'приход': return '#14b8a6'
                          case 'расход': return '#ef4444'
                          default: return '#6b7280'
                        }
                      }
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                          style={{borderColor: '#e5e7eb'}}
                          onClick={() => router.push(`/cash/expense/view/${item.id}`)}
                        >
                          <td className="py-3 px-3 text-gray-800 font-medium">{item.id}</td>
                          <td className="py-3 px-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-800">{item.city || directorCities[0] || 'Москва'}</td>
                          <td className="py-3 px-3 text-gray-800">{item.paymentPurpose || '-'}</td>
                          <td className="py-3 px-3 text-gray-800 font-semibold text-red-600">{Number(item.amount).toLocaleString()} ₽</td>
                          <td className="py-3 px-3 text-gray-800">{item.note || '-'}</td>
                          <td className="py-3 px-3 text-gray-800">{formatDate(item.dateCreate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Пагинация */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  maxVisiblePages={7}
                />
              </div>
            )}

      {/* Модальное окно добавления расхода */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-in-scale">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Добавить расход</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors duration-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Город */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Город</label>
                <CustomSelect
                  value={formData.city}
                  onChange={(value) => handleInputChange('city', value)}
                  options={cities}
                  placeholder="Выберите город"
                  selectId="city"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                />
              </div>

              {/* Сумма */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Сумма</label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Введите сумму"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Назначение платежа */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Назначение платежа</label>
                <CustomSelect
                  value={formData.purpose}
                  onChange={(value) => handleInputChange('purpose', value)}
                  options={purposes}
                  placeholder="Выберите назначение"
                  selectId="purpose"
                  openSelect={openSelect}
                  setOpenSelect={setOpenSelect}
                />
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Введите комментарий"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Чеки (обязательно, множественная загрузка) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Чек <span className="text-red-500">*</span>
                  {receiptFiles.length > 0 && (
                    <span className="text-gray-500 font-normal ml-2">({receiptFiles.length} файл(ов))</span>
                  )}
                </label>
                
                {receiptError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {receiptError}
                  </div>
                )}
                
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragOver
                      ? 'border-teal-400 bg-teal-50'
                      : receiptFiles.length > 0
                        ? 'border-green-400 bg-green-50'
                        : receiptError
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragOver={handleReceiptDragOver}
                  onDragLeave={handleReceiptDragLeave}
                  onDrop={handleReceiptDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={!canAddMoreReceipts}
                    onChange={handleReceiptInputChange}
                  />

                  {receiptFiles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {receiptFiles.map((fileWithPreview) => (
                          <div key={fileWithPreview.id} className="relative group">
                            {fileWithPreview.file?.type.startsWith('image/') ? (
                              <img
                                src={fileWithPreview.preview}
                                alt={fileWithPreview.file?.name || 'Чек'}
                                className="w-full h-16 object-cover rounded-lg shadow-sm"
                              />
                            ) : (
                              <div className="w-full h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReceiptFile(fileWithPreview.id)
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
                              title="Удалить"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="text-xs text-gray-600 text-center mt-1 truncate px-1">
                              {fileWithPreview.file?.name || 'Файл'}
                            </div>
                          </div>
                        ))}
                      </div>
                      {canAddMoreReceipts && (
                        <p className="text-xs text-gray-500">Нажмите или перетащите для добавления ещё файлов</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {dragOver ? 'Отпустите файлы' : 'Перетащите чеки сюда'}
                      </p>
                      <p className="text-xs text-gray-500">или нажмите для выбора (можно несколько)</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (макс. 10 файлов)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setReceiptError(null)
                  removeAllReceiptFiles()
                  setFormData({ city: '', amount: '', purpose: '', comment: '' })
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || receiptFiles.length === 0}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium ${
                  receiptFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                } disabled:opacity-50`}
                title={receiptFiles.length === 0 ? 'Прикрепите хотя бы один чек' : ''}
              >
                {isSubmitting ? 'Загрузка...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Стили для кастомного скроллбара */}
      <style jsx global>{`
        /* Custom scroll for dropdown */
        .custom-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .custom-dropdown::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb {
          background: #2a6b68;
          border-radius: 3px;
        }
        .custom-dropdown::-webkit-scrollbar-thumb:hover {
          background: #1a5a57;
        }
      `}</style>
    </div>
  )
}

export default function ExpensePage() {
  return <ExpenseContent />
}