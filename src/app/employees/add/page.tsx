"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CustomInput } from '@/components/ui/custom-input'
import { apiClient, CreateEmployeeDto } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, ChevronDown, X, Upload, Check, ArrowLeft } from 'lucide-react'


function AddEmployeeContent() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'
  
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
    passportFile: null as File | null,
    contractFile: null as File | null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Используем города из Zustand store (надёжный источник)
  const availableCities = user?.cities || []

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  const removeCity = (cityToRemove: string) => {
    setSelectedCities(prev => prev.filter(city => city !== cityToRemove))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'passportFile' | 'contractFile') => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, [fileType]: file }))
  }

  const removeFile = (fileType: 'passportFile' | 'contractFile') => {
    setFormData(prev => ({ ...prev, [fileType]: null }))
  }

  const transliterate = (text: string): string => {
    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    return text.toLowerCase().split('').map(char => translitMap[char] || char).join('')
  }

  const generateLogin = () => {
    const nameParts = formData.name.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      const surname = transliterate(nameParts[0])
      const firstName = transliterate(nameParts[1])
      const randomNum = Math.floor(Math.random() * 100)
      setFormData(prev => ({ ...prev, login: `${surname}.${firstName}.${randomNum}` }))
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
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
      
      const employeeData: CreateEmployeeDto = {
        name: formData.name,
        login: formData.login || undefined,
        password: formData.password || undefined,
        cities: selectedCities,
        note: formData.notes || undefined,
        tgId: formData.telegramId || undefined,
        chatId: formData.chatId || undefined,
        passportDoc: undefined,
        contractDoc: undefined,
      }
      
      await apiClient.createEmployee(employeeData)
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
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-[#f5f5f0]'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </button>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Добавить сотрудника
          </h1>
        </div>

        {/* Карточка формы */}
        <div className={`rounded-2xl p-6 md:p-8 shadow-lg transition-colors duration-300 ${
          isDark ? 'bg-[#2a3441]' : 'bg-white'
        }`}>
          
          {/* Вкладки */}
          <div className="mb-6">
            <div className={`flex p-1 rounded-lg ${isDark ? 'bg-[#1e2530]' : 'bg-gray-100'}`}>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'bg-[#0d5c4b] text-white'
                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Личная информация
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-[#0d5c4b] text-white'
                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Документы
              </button>
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Вкладка "Личная информация" */}
            {activeTab === 'personal' && (
              <div className="space-y-5">
                {/* ФИО */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    ФИО *
                  </Label>
                  <CustomInput
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Введите ФИО сотрудника"
                    required
                    className={`h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                      isDark 
                        ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                        : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                </div>

                {/* Города */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Город *
                  </Label>
                  {availableCities.length === 0 ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                        У вас нет доступных городов. Обратитесь к администратору.
                      </p>
                    </div>
                  ) : (
                    <div className="relative" ref={cityDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                        className={`w-full h-12 rounded-lg px-4 text-left flex items-center justify-between focus:ring-2 focus:ring-[#0d5c4b] focus:outline-none ${
                          isDark 
                            ? 'bg-[#1e2530] text-gray-100' 
                            : 'bg-[#f5f5f0] text-gray-800'
                        }`}
                      >
                        <span className={selectedCities.length === 0 ? (isDark ? 'text-gray-500' : 'text-gray-400') : (isDark ? 'text-gray-100' : 'text-gray-800')}>
                          {selectedCities.length === 0 ? 'Выберите города' : selectedCities.join(', ')}
                        </span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${isDark ? 'text-gray-500' : 'text-gray-400'} ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isCityDropdownOpen && (
                        <div className={`absolute z-50 w-full mt-2 rounded-lg shadow-lg max-h-60 overflow-y-auto ${
                          isDark ? 'bg-[#2a3441] border border-[#3d4a5c]' : 'bg-white border border-gray-200'
                        }`}>
                          {availableCities.map((city) => (
                            <div
                              key={city}
                              className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                                isDark ? 'hover:bg-[#3d4a5c]' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleCityToggle(city)}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                selectedCities.includes(city)
                                  ? 'bg-[#0d5c4b] border-[#0d5c4b]'
                                  : isDark ? 'border-gray-500' : 'border-gray-300'
                              }`}>
                                {selectedCities.includes(city) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{city}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedCities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCities.map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-[#0d5c4b] text-white"
                        >
                          {city}
                          <button type="button" onClick={() => removeCity(city)} className="hover:text-red-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Заметка */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Заметка
                  </Label>
                  <CustomInput
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Введите заметку о сотруднике"
                    className={`h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                      isDark 
                        ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                        : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                </div>

                {/* Telegram */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Telegram ID
                    </Label>
                    <CustomInput
                      name="telegramId"
                      value={formData.telegramId}
                      onChange={handleInputChange}
                      placeholder="Введите Telegram ID"
                      className={`h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                        isDark 
                          ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                          : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Chat ID
                    </Label>
                    <CustomInput
                      name="chatId"
                      value={formData.chatId}
                      onChange={handleInputChange}
                      placeholder="Введите Chat ID"
                      className={`h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                        isDark 
                          ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                          : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Логин */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Логин *
                  </Label>
                  <div className="flex gap-3">
                    <CustomInput
                      name="login"
                      value={formData.login}
                      onChange={handleInputChange}
                      placeholder="Введите логин"
                      required
                      className={`flex-1 h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                        isDark 
                          ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                          : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                      }`}
                    />
                    <Button
                      type="button"
                      onClick={generateLogin}
                      className="h-12 px-4 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white text-sm font-medium rounded-lg"
                    >
                      Сгенерировать
                    </Button>
                  </div>
                </div>

                {/* Пароль */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Пароль *
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <CustomInput
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Введите пароль"
                        required
                        className={`h-12 pr-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                          isDark 
                            ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                            : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={generatePassword}
                      className="h-12 px-4 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white text-sm font-medium rounded-lg"
                    >
                      Сгенерировать
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Вкладка "Документы" */}
            {activeTab === 'documents' && (
              <div className="space-y-5">
                {/* Паспорт */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Паспорт
                  </Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    isDark ? 'border-[#3d4a5c] hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                  }`}>
                    {formData.passportFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-6 h-6 text-green-500" />
                          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            {formData.passportFile.name}
                          </span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Размер: {(formData.passportFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          onClick={() => removeFile('passportFile')}
                          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"
                        >
                          Удалить файл
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className={`w-10 h-10 mx-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            Загрузить паспорт
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            PDF, JPG, PNG до 10MB
                          </p>
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
                          onClick={() => document.getElementById('passportFile')?.click()}
                          className={`${isDark ? 'bg-[#3d4a5c] hover:bg-[#4d5a6c] text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                          Выбрать файл
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Договор */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Договор
                  </Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    isDark ? 'border-[#3d4a5c] hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                  }`}>
                    {formData.contractFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-6 h-6 text-green-500" />
                          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            {formData.contractFile.name}
                          </span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Размер: {(formData.contractFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          onClick={() => removeFile('contractFile')}
                          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"
                        >
                          Удалить файл
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className={`w-10 h-10 mx-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            Загрузить договор
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            PDF, JPG, PNG до 10MB
                          </p>
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
                          onClick={() => document.getElementById('contractFile')?.click()}
                          className={`${isDark ? 'bg-[#3d4a5c] hover:bg-[#4d5a6c] text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
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
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className={`flex-1 h-12 font-medium rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-[#3d4a5c] hover:bg-[#4d5a6c] text-gray-200' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || availableCities.length === 0}
                className="flex-1 h-12 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Добавление...
                  </span>
                ) : availableCities.length === 0 ? (
                  'Нет доступных городов'
                ) : (
                  'Добавить сотрудника'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AddEmployeePage() {
  return <AddEmployeeContent />
}
