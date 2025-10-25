"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSignedUrl } from '@/lib/s3-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, Employee } from '@/lib/api'
import { logger } from '@/lib/logger'

import AuthGuard from "@/components/auth-guard"

function EmployeeViewContent() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string
  
  const [activeTab, setActiveTab] = useState('personal')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  
  // Файлы документов
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [passportPreview, setPassportPreview] = useState<string | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const [passportDragOver, setPassportDragOver] = useState(false)
  const [contractDragOver, setContractDragOver] = useState(false)
  
  // Пароль
  const [showPassword, setShowPassword] = useState(false)

  // Получаем города текущего директора
  const currentUser = apiClient.getCurrentUser()
  const availableCities = Array.isArray(currentUser?.cities) ? currentUser.cities : []

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getEmployee(parseInt(employeeId))
        // Устанавливаем пустой пароль при загрузке и сохраняем информацию о наличии пароля
        setEmployee({
          ...data,
          password: ''
        })
        setHasPassword(data.hasPassword || false)
        setSelectedCities(data.cities)
        
        // Загружаем подписанные URL для существующих файлов
        if (data.passportDoc) {
          const passportUrl = await getSignedUrl(data.passportDoc)
          setPassportPreview(passportUrl)
        }
        if (data.contractDoc) {
          const contractUrl = await getSignedUrl(data.contractDoc)
          setContractPreview(contractUrl)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки сотрудника')
      } finally {
        setLoading(false)
      }
    }

    if (employeeId) {
      fetchEmployee()
    }
  }, [employeeId])

  // Закрытие выпадающих списков при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      if (passportPreview && passportPreview.startsWith('blob:')) {
        clearPreview(passportPreview)
      }
      if (contractPreview && contractPreview.startsWith('blob:')) {
        clearPreview(contractPreview)
      }
    }
  }, [passportPreview, contractPreview])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
      return '#10b981' // Яркий зеленый
    }
    if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
      return '#ef4444' // Яркий красный
    }
    return '#6b7280' // Серый по умолчанию
  }

  // Функции для работы с городами
  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => {
      const newCities = prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
      
      return newCities
    })
  }

  const removeCity = (cityToRemove: string) => {
    setSelectedCities(prev => {
      const newCities = prev.filter(city => city !== cityToRemove)
      return newCities
    })
  }

  const handleStatusChange = (newStatus: string) => {
    setEmployee(prev => prev ? { ...prev, statusWork: newStatus } : null)
    setIsStatusDropdownOpen(false)
  }

  // Транслитерация с русского на английский
  const transliterate = (text: string): string => {
    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    return text.toLowerCase().split('').map(char => {
      return translitMap[char] || char
    }).join('')
  }

  // Генерация логина
  const generateLogin = () => {
    const name = employee?.name || ''
    const nameParts = name.split(' ').filter(part => part.length > 0)
    let login = ''
    
    if (nameParts.length >= 2) {
      // Транслитерируем и берем первую букву имени + фамилию
      const firstName = transliterate(nameParts[0])
      const lastName = transliterate(nameParts[nameParts.length - 1])
      login = firstName[0] + lastName
    } else if (nameParts.length === 1) {
      // Если только одно слово, транслитерируем и берем первые 4 символа
      const transliterated = transliterate(nameParts[0])
      login = transliterated.substring(0, 4)
    } else {
      // Если нет имени, генерируем случайный логин
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      login = 'user'
      for (let i = 0; i < 4; i++) {
        login += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    }
    
    // Добавляем случайные цифры в конце
    login += Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    setEmployee(prev => prev ? { ...prev, login } : null)
  }

  // Генерация пароля
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setEmployee(prev => prev ? { ...prev, password } : null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEmployee(prev => prev ? { ...prev, [name]: value } : null)
  }

  // Функции для обработки файлов
  const createFilePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  const clearPreview = (url: string) => {
    URL.revokeObjectURL(url)
  }

  const handleFile = (file: File, type: 'passport' | 'contract') => {
    if (type === 'passport') {
      if (passportPreview) clearPreview(passportPreview)
      setPassportFile(file)
      setPassportPreview(createFilePreview(file))
    } else {
      if (contractPreview) clearPreview(contractPreview)
      setContractFile(file)
      setContractPreview(createFilePreview(file))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'passportFile' | 'contractFile') => {
    const file = e.target.files?.[0] || null
    if (file) {
      handleFile(file, fileType === 'passportFile' ? 'passport' : 'contract')
    }
  }

  const removeFile = (fileType: 'passportFile' | 'contractFile') => {
    if (fileType === 'passportFile') {
      if (passportPreview) {
        if (passportPreview.startsWith('blob:')) {
          clearPreview(passportPreview)
        }
      }
      setPassportFile(null)
      setPassportPreview(null)
    } else {
      if (contractPreview) {
        if (contractPreview.startsWith('blob:')) {
          clearPreview(contractPreview)
        }
      }
      setContractFile(null)
      setContractPreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    
    setIsUpdating(true)
    setError(null)
    
    try {
      // Валидация
      if (!employee.name.trim()) {
        setError('Имя сотрудника обязательно для заполнения')
        return
      }
      
      if (availableCities.length === 0) {
        setError('У вас нет доступных городов для назначения сотруднику')
        return
      }
      
      if (selectedCities.length === 0) {
        setError('Необходимо выбрать хотя бы один город')
        return
      }
      
      // Загружаем файлы в S3 если они есть
      let passportDocPath = employee.passportDoc
      let contractDocPath = employee.contractDoc

      if (passportFile) {
        try {
          const passportResult = await apiClient.uploadMasterPassport(passportFile)
          passportDocPath = passportResult.filePath
        } catch (uploadError) {
          setError('Ошибка загрузки паспорта: ' + (uploadError instanceof Error ? uploadError.message : 'Неизвестная ошибка'))
          return
        }
      } else if (!passportPreview) {
        // Если файл был удален (нет ни нового файла, ни превью), обнуляем путь
        passportDocPath = undefined
      }

      if (contractFile) {
        try {
          const contractResult = await apiClient.uploadMasterContract(contractFile)
          contractDocPath = contractResult.filePath
        } catch (uploadError) {
          setError('Ошибка загрузки договора: ' + (uploadError instanceof Error ? uploadError.message : 'Неизвестная ошибка'))
          return
        }
      } else if (!contractPreview) {
        // Если файл был удален (нет ни нового файла, ни превью), обнуляем путь
        contractDocPath = undefined
      }

      // Подготавливаем данные для отправки
      const employeeData = {
        name: employee.name,
        login: employee.login || undefined,
        password: employee.password || undefined, // Пароль будет хэширован на backend
        cities: selectedCities,
        statusWork: employee.statusWork,
        note: employee.note || undefined,
        tgId: employee.tgId || undefined,
        chatId: employee.chatId || undefined,
        passportDoc: passportDocPath,
        contractDoc: contractDocPath,
      }
      
      // Обновляем сотрудника через API
      const updatedEmployee = await apiClient.updateEmployee(employee.id, employeeData)
      
      // Обновляем локальное состояние, но сохраняем исходный пароль
      setEmployee(prev => prev ? {
        ...updatedEmployee,
        password: prev.password // Сохраняем исходный пароль, не хэш
      } : updatedEmployee)
      setSelectedCities(updatedEmployee.cities)
      
      // Обновляем статус наличия пароля
      if (employeeData.password) {
        setHasPassword(true)
      }
      
      // Обновляем превью файлов после успешного сохранения (получаем подписанные URL)
      if (passportDocPath) {
        const passportUrl = await getSignedUrl(passportDocPath)
        setPassportPreview(passportUrl)
      } else {
        setPassportPreview(null)
      }
      
      if (contractDocPath) {
        const contractUrl = await getSignedUrl(contractDocPath)
        setContractPreview(contractUrl)
      } else {
        setContractPreview(null)
      }
      
      // Очищаем локальные файлы после успешного сохранения
      setPassportFile(null)
      setContractFile(null)
      
      // Успешное обновление
      
    } catch (error) {
      logger.error('Ошибка при обновлении сотрудника', error)
      setError(error instanceof Error ? error.message : 'Ошибка при обновлении сотрудника')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-lg">Загрузка сотрудника...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-red-400 text-lg">Ошибка: {error}</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-lg">Сотрудник не найден</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Навигация */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/employees')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                ← Назад
              </button>
            </div>


            {/* Отображение ошибок */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Вкладки */}
            <div className="mb-8">
              <div className="flex space-x-1 p-1 rounded-lg bg-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === 'personal' ? '#2a6b68' : 'transparent',
                    color: activeTab === 'personal' ? 'white' : '#9ca3af'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'personal') {
                      (e.target as HTMLElement).style.backgroundColor = '#2a6b68';
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'personal') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#9ca3af';
                    }
                  }}
                >
                  Личная информация
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === 'documents' ? '#2a6b68' : 'transparent',
                    color: activeTab === 'documents' ? 'white' : '#9ca3af'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'documents') {
                      (e.target as HTMLElement).style.backgroundColor = '#2a6b68';
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'documents') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#9ca3af';
                    }
                  }}
                >
                  Документы
                </button>
              </div>
            </div>

            {/* Форма */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Вкладка "Личная информация" */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  {/* Основная информация */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white text-sm font-medium">
                      ФИО *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={employee.name}
                      onChange={handleInputChange}
                      placeholder="Введите ФИО сотрудника"
                      required
                      className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                      onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login" className="text-white text-sm font-medium">
                      Логин
                    </Label>
                    <div className="relative">
                      <Input
                        id="login"
                        name="login"
                        value={employee.login || ''}
                        onChange={handleInputChange}
                        placeholder="Введите логин или сгенерируйте"
                        className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent pr-12"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                      <button
                        type="button"
                        onClick={generateLogin}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        title="Сгенерировать логин"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white text-sm font-medium">
                      Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={employee.password || ''}
                        onChange={handleInputChange}
                        placeholder={hasPassword ? "Пароль установлен (введите новый для изменения)" : "Введите пароль или сгенерируйте"}
                        className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent pr-20"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Сгенерировать пароль"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Город и Статус в одной строке */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white text-sm font-medium">
                        Город *
                      </Label>
                      {availableCities.length === 0 ? (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
                          <p className="text-yellow-400 text-sm">
                            У вас нет доступных городов. Обратитесь к администратору.
                          </p>
                        </div>
                      ) : (
                        <div className="relative" ref={cityDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:border-transparent"
                            onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                            onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                          >
                            <span className={selectedCities.length === 0 ? 'text-gray-400' : 'text-white'}>
                              {selectedCities.length === 0 ? 'Выберите города' : selectedCities.join(', ')}
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isCityDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {availableCities.map((city) => (
                                <div
                                  key={city}
                                  className="px-3 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center"
                                  onClick={() => handleCityToggle(city)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCities.includes(city)}
                                    onChange={() => {}}
                                    className="mr-2"
                                    style={{accentColor: '#2a6b68'}}
                                  />
                                  <span className="text-white">{city}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Выбранные города */}
                      {selectedCities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedCities.map((city) => (
                            <span
                              key={city}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs text-white"
                              style={{backgroundColor: '#2a6b68'}}
                            >
                              {city}
                              <button
                                type="button"
                                onClick={() => removeCity(city)}
                                className="ml-1 hover:text-red-300"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white text-sm font-medium">
                        Статус
                      </Label>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:border-transparent"
                          onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                          onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                        >
                          <span className="text-white">{employee.statusWork}</span>
                          <svg className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isStatusDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
                            <div
                              className="px-3 py-2 text-white hover:bg-gray-700 cursor-pointer"
                              onClick={() => handleStatusChange('Работает')}
                            >
                              Работает
                            </div>
                            <div
                              className="px-3 py-2 text-white hover:bg-gray-700 cursor-pointer"
                              onClick={() => handleStatusChange('Уволен')}
                            >
                              Уволен
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-white text-sm font-medium">
                      Заметка
                    </Label>
                    <Input
                      id="note"
                      name="note"
                      value={employee.note || ''}
                      onChange={handleInputChange}
                      placeholder="Введите заметку о сотруднике"
                      className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                      onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                    />
                  </div>
                  
                  {/* Telegram информация */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="tgId" className="text-white text-sm font-medium">
                        Telegram ID
                      </Label>
                      <Input
                        id="tgId"
                        name="tgId"
                        value={employee.tgId || ''}
                        onChange={handleInputChange}
                        placeholder="Введите Telegram ID"
                        className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chatId" className="text-white text-sm font-medium">
                        Chat ID
                      </Label>
                      <Input
                        id="chatId"
                        name="chatId"
                        value={employee.chatId || ''}
                        onChange={handleInputChange}
                        placeholder="Введите Chat ID"
                        className="bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Вкладка "Документы" */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Паспорт */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">
                      Фото Паспорта
                      <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
                    </Label>
                    
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        passportDragOver 
                          ? 'border-blue-400 bg-blue-900/20' 
                          : passportPreview 
                            ? 'border-green-400 bg-green-900/20' 
                            : 'border-gray-600 bg-gray-800/50'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setPassportDragOver(true)
                      }}
                      onDragLeave={() => setPassportDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setPassportDragOver(false)
                        const file = e.dataTransfer.files[0]
                        if (file) handleFile(file, 'passport')
                      }}
                    >
                      {!passportPreview && (
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'passport')
                          }}
                        />
                      )}
                      
                      {passportPreview ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <img 
                              src={passportPreview} 
                              alt="Превью паспорта" 
                              className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={async (e) => {
                                e.stopPropagation()
                                let viewUrl = passportPreview
                                if (!passportPreview.startsWith('blob:') && employee.passportDoc) {
                                  viewUrl = await getSignedUrl(employee.passportDoc)
                                }
                                window.open(viewUrl, '_blank')
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-2 z-20">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  let downloadUrl = passportPreview
                                  if (!passportPreview.startsWith('blob:') && employee.passportDoc) {
                                    downloadUrl = await getSignedUrl(employee.passportDoc)
                                  }
                                  const link = document.createElement('a')
                                  link.href = downloadUrl
                                  link.download = passportFile?.name || 'passport'
                                  link.click()
                                }}
                                className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                                title="Скачать файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  removeFile('passportFile')
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                                title="Удалить файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 text-center">
                            {passportFile?.name || 'Загруженный файл'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-gray-300 text-2xl">📄</span>
                          </div>
                          <div className="text-gray-300 font-medium">
                            {passportDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
                          </div>
                          <div className="text-sm text-gray-400">или нажмите для выбора</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Договор */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">
                      Договор
                      <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
                    </Label>
                    
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        contractDragOver 
                          ? 'border-blue-400 bg-blue-900/20' 
                          : contractPreview 
                            ? 'border-green-400 bg-green-900/20' 
                            : 'border-gray-600 bg-gray-800/50'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setContractDragOver(true)
                      }}
                      onDragLeave={() => setContractDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setContractDragOver(false)
                        const file = e.dataTransfer.files[0]
                        if (file) handleFile(file, 'contract')
                      }}
                    >
                      {!contractPreview && (
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'contract')
                          }}
                        />
                      )}
                      
                      {contractPreview ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <img 
                              src={contractPreview} 
                              alt="Превью договора" 
                              className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={async (e) => {
                                e.stopPropagation()
                                let viewUrl = contractPreview
                                if (!contractPreview.startsWith('blob:') && employee.contractDoc) {
                                  viewUrl = await getSignedUrl(employee.contractDoc)
                                }
                                window.open(viewUrl, '_blank')
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-2 z-20">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  let downloadUrl = contractPreview
                                  if (!contractPreview.startsWith('blob:') && employee.contractDoc) {
                                    downloadUrl = await getSignedUrl(employee.contractDoc)
                                  }
                                  const link = document.createElement('a')
                                  link.href = downloadUrl
                                  link.download = contractFile?.name || 'contract'
                                  link.click()
                                }}
                                className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                                title="Скачать файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  removeFile('contractFile')
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                                title="Удалить файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 text-center">
                            {contractFile?.name || 'Загруженный файл'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-gray-300 text-2xl">📄</span>
                          </div>
                          <div className="text-gray-300 font-medium">
                            {contractDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
                          </div>
                          <div className="text-sm text-gray-400">или нажмите для выбора</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isUpdating || availableCities.length === 0}
                  className="flex-1 h-12 text-white font-medium"
                  style={{backgroundColor: availableCities.length === 0 ? '#6b7280' : '#2a6b68'}}
                  onMouseEnter={(e) => !isUpdating && availableCities.length > 0 && ((e.target as HTMLElement).style.backgroundColor = '#1a5a57')}
                  onMouseLeave={(e) => !isUpdating && availableCities.length > 0 && ((e.target as HTMLElement).style.backgroundColor = '#2a6b68')}
                >
                  {isUpdating ? 'Сохранение...' : availableCities.length === 0 ? 'Нет доступных городов' : 'Сохранить изменения'}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/employees')}
                  disabled={isUpdating}
                  className="flex-1 h-12 border"
                  style={{backgroundColor: 'transparent', borderColor: '#114643', color: 'white'}}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#2a6b68';
                    (e.target as HTMLElement).style.borderColor = '#2a6b68';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    (e.target as HTMLElement).style.borderColor = '#114643';
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeViewPage() {
  return (
    <AuthGuard>
      <EmployeeViewContent />
    </AuthGuard>
  )
}
