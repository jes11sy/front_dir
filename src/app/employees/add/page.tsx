"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient, CreateEmployeeDto } from '@/lib/api'
import { logger } from '@/lib/logger'

import AuthGuard from "@/components/auth-guard"

function AddEmployeeContent() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('personal')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    notes: '',
    telegramId: '',
    chatId: '',
    // Документы
    passportFile: null as File | null,
    contractFile: null as File | null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Получаем города текущего директора
  const currentUser = apiClient.getCurrentUser()
  const availableCities = currentUser?.cities || []

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  // Функции для обработки файлов
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'passportFile' | 'contractFile') => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }))
  }

  const removeFile = (fileType: 'passportFile' | 'contractFile') => {
    setFormData(prev => ({
      ...prev,
      [fileType]: null
    }))
  }

  // Функции генерации
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

  const generateLogin = () => {
    const nameParts = formData.name.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      const surname = transliterate(nameParts[0])
      const firstName = transliterate(nameParts[1])
      const randomNum = Math.floor(Math.random() * 100)
      const login = `${surname}.${firstName}.${randomNum}`
      setFormData(prev => ({
        ...prev,
        login: login
      }))
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({
      ...prev,
      password: password
    }))
  }

  // Функции для обработки формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Валидация
      if (!formData.name.trim()) {
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
      
      // Подготавливаем данные для отправки
      const employeeData: CreateEmployeeDto = {
        name: formData.name,
        login: formData.login || undefined,
        password: formData.password || undefined,
        cities: selectedCities,
        note: formData.notes || undefined,
        tgId: formData.telegramId || undefined,
        chatId: formData.chatId || undefined,
        // TODO: Добавить обработку файлов
        passportDoc: undefined,
        contractDoc: undefined,
      }
      
      await apiClient.createEmployee(employeeData)
      
      // После успешного добавления перенаправляем на страницу сотрудников
      router.push('/employees')
    } catch (error) {
      logger.error('Ошибка при добавлении сотрудника', error)
      setError(error instanceof Error ? error.message : 'Ошибка при добавлении сотрудника')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/employees')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Навигация */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200"
              >
                ← Назад к списку сотрудников
              </Button>
            </div>


            {/* Вкладки */}
            <div className="mb-8 animate-fade-in">
              <div className="flex space-x-1 p-1 rounded-lg bg-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === 'personal' ? '#14b8a6' : 'transparent',
                    color: activeTab === 'personal' ? 'white' : '#6b7280'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'personal') {
                      (e.target as HTMLElement).style.backgroundColor = '#14b8a6';
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'personal') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#6b7280';
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
                    backgroundColor: activeTab === 'documents' ? '#14b8a6' : 'transparent',
                    color: activeTab === 'documents' ? 'white' : '#6b7280'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'documents') {
                      (e.target as HTMLElement).style.backgroundColor = '#14b8a6';
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'documents') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#6b7280';
                    }
                  }}
                >
                  Документы
                </button>
              </div>
            </div>

            {/* Отображение ошибок */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Вкладка "Личная информация" */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  {/* Основная информация */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 text-sm font-medium">
                      ФИО *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Введите ФИО сотрудника"
                      required
                      className="bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                      onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                      onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">
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
                          className="w-full bg-white border-2 border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-left flex items-center justify-between focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                          onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                          onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                        >
                          <span className={selectedCities.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                            {selectedCities.length === 0 ? 'Выберите города' : selectedCities.join(', ')}
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isCityDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {availableCities.map((city) => (
                              <div
                                key={city}
                                className="px-3 py-2 text-gray-700 hover:bg-teal-50 cursor-pointer flex items-center transition-colors duration-200"
                                onClick={() => handleCityToggle(city)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCities.includes(city)}
                                  onChange={() => {}}
                                  className="mr-2"
                                  style={{accentColor: '#2a6b68'}}
                                />
                                <span className="text-gray-700">{city}</span>
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
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs text-gray-700"
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
                    <Label htmlFor="notes" className="text-gray-700 text-sm font-medium">
                      Заметка
                    </Label>
                    <Input
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Введите заметку о сотруднике"
                      className="bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                      onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                      onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                    />
                  </div>
                  
                  {/* Telegram информация */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="telegramId" className="text-gray-700 text-sm font-medium">
                        Telegram ID
                      </Label>
                      <Input
                        id="telegramId"
                        name="telegramId"
                        value={formData.telegramId}
                        onChange={handleInputChange}
                        placeholder="Введите Telegram ID"
                        className="bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chatId" className="text-gray-700 text-sm font-medium">
                        Chat ID
                      </Label>
                      <Input
                        id="chatId"
                        name="chatId"
                        value={formData.chatId}
                        onChange={handleInputChange}
                        placeholder="Введите Chat ID"
                        className="bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:outline-none shadow-sm hover:shadow-md transition-all duration-200"
                        onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                        onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                      />
                    </div>
                  </div>
                  
                  {/* Учетные данные */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="login" className="text-gray-700 text-sm font-medium">
                        Логин *
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="login"
                          name="login"
                          value={formData.login}
                          onChange={handleInputChange}
                          placeholder="Введите логин"
                          required
                          className="flex-1 bg-gray-800 border border-gray-600 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                          onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                          onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                        />
                        <Button
                          type="button"
                          onClick={generateLogin}
                          className="px-3 py-2 text-xs"
                          style={{backgroundColor: '#2a6b68', color: 'white'}}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                        >
                          Сгенерировать
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                        Пароль *
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Введите пароль"
                            required
                            className="w-full pr-10 bg-gray-800 border border-gray-600 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                            onFocus={(e) => (e.target as HTMLElement).style.boxShadow = '0 0 0 2px #2a6b68'}
                            onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'none'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
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
                        </div>
                        <Button
                          type="button"
                          onClick={generatePassword}
                          className="px-3 py-2 text-xs"
                          style={{backgroundColor: '#2a6b68', color: 'white'}}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                        >
                          Сгенерировать
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Вкладка "Документы" */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Паспорт */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">
                      Паспорт
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors" style={{borderColor: '#114643'}} onMouseEnter={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'} onMouseLeave={(e) => (e.target as HTMLElement).style.borderColor = '#114643'}>
                      {formData.passportFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700 font-medium">{formData.passportFile.name}</span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Размер: {(formData.passportFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile('passportFile')}
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
                          >
                            Удалить файл
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div>
                            <p className="text-gray-700 font-medium">Загрузить паспорт</p>
                            <p className="text-gray-400 text-sm">PDF, JPG, PNG до 10MB</p>
                          </div>
                          <input
                            type="file"
                            id="passportFile"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, 'passportFile')}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => document.getElementById('passportFile')?.click()}
                            className="border"
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
                            Выбрать файл
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Договор */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">
                      Договор
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors" style={{borderColor: '#114643'}} onMouseEnter={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'} onMouseLeave={(e) => (e.target as HTMLElement).style.borderColor = '#114643'}>
                      {formData.contractFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700 font-medium">{formData.contractFile.name}</span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Размер: {(formData.contractFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile('contractFile')}
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
                          >
                            Удалить файл
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div>
                            <p className="text-gray-700 font-medium">Загрузить договор</p>
                            <p className="text-gray-400 text-sm">PDF, JPG, PNG до 10MB</p>
                          </div>
                          <input
                            type="file"
                            id="contractFile"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, 'contractFile')}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => document.getElementById('contractFile')?.click()}
                            className="border"
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
                            Выбрать файл
                          </Button>
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
                  disabled={isSubmitting || availableCities.length === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                >
                  {isSubmitting ? 'Добавление...' : availableCities.length === 0 ? 'Нет доступных городов' : 'Добавить сотрудника'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-md"
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

export default function AddEmployeePage() {
  return (
    <AuthGuard>
      <AddEmployeeContent />
    </AuthGuard>
  )
}
