"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from "@/components/auth-guard"
import { apiClient, CashTransaction } from '@/lib/api'
import CustomSelect from '@/components/optimized/CustomSelect'

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
  const [totalAmount, setTotalAmount] = useState(0)
  const itemsPerPage = 10
  const [openSelect, setOpenSelect] = useState<string | null>(null)

  // Состояние формы добавления расхода
  const [formData, setFormData] = useState({
    city: '',
    amount: '',
    purpose: '',
    comment: '',
    receipt: null as File | null
  })

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

  // Загрузка данных
  const loadExpenseData = async () => {
    try {
      setLoading(true)
      setError(null)
      const expenses = await apiClient.getCashExpense()
      setExpenseData(expenses)
      
      // Вычисляем общую сумму
      const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
      setTotalAmount(total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenseData()
  }, [])

  // Функции для работы с формой
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, receipt: file }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileChange(files[0])
    }
  }

  const handleSubmit = async () => {
    try {
      const cityName = cities.find(c => c.value === formData.city)?.label || directorCities[0] || 'Москва'
      const purposeName = purposes.find(p => p.value === formData.purpose)?.label || 'Иное'
      
      let receiptDoc = null
      
      // Загружаем файл в S3, если он есть
      if (formData.receipt) {
        const uploadResult = await apiClient.uploadReceipt(formData.receipt, 'cash')
        receiptDoc = uploadResult.filePath
      }
      
      await apiClient.createCashTransaction({
        name: 'расход',
        amount: Number(formData.amount),
        city: cityName,
        note: formData.comment,
        paymentPurpose: purposeName,
        receiptDoc: receiptDoc || undefined
      })
      
      setShowAddModal(false)
      setFormData({ city: '', amount: '', purpose: '', comment: '', receipt: null })
      await loadExpenseData() // Перезагружаем данные
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания расхода')
    }
  }

  // Вычисляем данные для текущей страницы
  const safeExpenseData = Array.isArray(expenseData) ? expenseData : []
  const totalPages = Math.ceil(safeExpenseData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = safeExpenseData.slice(startIndex, endIndex)

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
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            

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

            {/* Кнопка добавить расход */}
            <div className="mb-4">
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

            {/* Фильтрация по дате */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white font-semibold">Фильтр</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  {showFilters ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showFilters && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">От даты</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm"
                        style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                        onFocus={(e) => e.target.style.borderColor = '#2a6b68'}
                        onBlur={(e) => e.target.style.borderColor = '#334155'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">До даты</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none text-sm"
                        style={{backgroundColor: '#1e293b', borderColor: '#334155'}}
                        onFocus={(e) => e.target.style.borderColor = '#2a6b68'}
                        onBlur={(e) => e.target.style.borderColor = '#334155'}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                      >
                        Сбросить
                      </button>
                      <button 
                        className="px-3 py-1.5 text-white rounded text-sm transition-colors"
                        style={{backgroundColor: '#2a6b68'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a5a57'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a6b68'}
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
                <table className="w-full border-collapse text-sm bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Тип</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Назначение платежа</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Сумма</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Комментарий</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Дата</th>
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
                          <td className="py-4 px-4 text-gray-800 font-medium">{item.id}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(item.name)}}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-800">{item.city || directorCities[0] || 'Москва'}</td>
                          <td className="py-4 px-4 text-gray-800">{item.paymentPurpose || '-'}</td>
                          <td className="py-4 px-4 text-gray-800 font-semibold text-red-600">{Number(item.amount).toLocaleString()} ₽</td>
                          <td className="py-4 px-4 text-gray-800">{item.note || '-'}</td>
                          <td className="py-4 px-4 text-gray-800">{formatDate(item.dateCreate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Пагинация */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2 flex-wrap animate-fade-in">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-300 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  ←
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white hover:shadow-md'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-300 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
                >
                  →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Модальное окно добавления расхода */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Добавить расход</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Город */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Город</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Сумма</label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Введите сумму"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:border-transparent"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Назначение платежа */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Назначение платежа</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Введите комментарий"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:border-transparent"
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2a6b68'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Чек */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Чек</label>
                <div className="relative">
                  <input
                    type="file"
                    id="receipt-upload"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                  <div
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors pointer-events-none"
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2a6b68'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#4b5563'}
                  >
                    {formData.receipt ? (
                      <div className="flex flex-col items-center">
                        {formData.receipt.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(formData.receipt)}
                            alt="Предпросмотр"
                            className="w-16 h-16 object-cover rounded border border-gray-600 mb-2"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-600 rounded border border-gray-500 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <p className="text-xs text-green-400 font-medium">{formData.receipt.name}</p>
                        <p className="text-xs text-gray-500">Нажмите для изменения</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-400 text-center">
                          <span className="font-medium" style={{color: '#2a6b68'}}>Перетащите файл сюда</span>
                        </p>
                        <p className="text-xs text-gray-500">или нажмите для выбора</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                style={{backgroundColor: '#ef4444'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                Добавить
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
  return (
    <AuthGuard>
      <ExpenseContent />
    </AuthGuard>
  )
}