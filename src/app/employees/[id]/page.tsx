"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSignedUrl } from '@/lib/s3-utils'
import { Label } from '@/components/ui/label'
import { CustomInput } from '@/components/ui/custom-input'
import { apiClient, Employee } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from '@/components/ui/toast'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, ChevronDown, X, Upload, Check, ArrowLeft, RefreshCw, Download, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-screen'


function EmployeeViewContent() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string
  const { theme } = useDesignStore()
  const { user } = useAuthStore()
  const isDark = theme === 'dark'
  
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
  
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [passportPreview, setPassportPreview] = useState<string | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const [passportDragOver, setPassportDragOver] = useState(false)
  const [contractDragOver, setContractDragOver] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)

  // Используем города из Zustand store (надёжный источник)
  const availableCities = Array.isArray(user?.cities) ? user.cities : []

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getEmployee(parseInt(employeeId))
        setEmployee({ ...data, password: '' })
        setHasPassword(data.hasPassword || false)
        setSelectedCities(data.cities)
        
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (passportPreview && passportPreview.startsWith('blob:')) clearPreview(passportPreview)
      if (contractPreview && contractPreview.startsWith('blob:')) clearPreview(contractPreview)
    }
  }, [passportPreview, contractPreview])

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city])
  }

  const removeCity = (cityToRemove: string) => {
    setSelectedCities(prev => prev.filter(city => city !== cityToRemove))
  }

  const handleStatusChange = (newStatus: string) => {
    setEmployee(prev => prev ? { ...prev, statusWork: newStatus } : null)
    setIsStatusDropdownOpen(false)
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
    const name = employee?.name || ''
    const nameParts = name.split(' ').filter(part => part.length > 0)
    let login = ''
    
    if (nameParts.length >= 2) {
      const firstName = transliterate(nameParts[0])
      const lastName = transliterate(nameParts[nameParts.length - 1])
      login = firstName[0] + lastName
    } else if (nameParts.length === 1) {
      login = transliterate(nameParts[0]).substring(0, 4)
    } else {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      login = 'user'
      for (let i = 0; i < 4; i++) login += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    login += Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setEmployee(prev => prev ? { ...prev, login } : null)
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    setEmployee(prev => prev ? { ...prev, password } : null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEmployee(prev => prev ? { ...prev, [name]: value } : null)
  }

  const createFilePreview = (file: File): string => URL.createObjectURL(file)
  const clearPreview = (url: string) => URL.revokeObjectURL(url)

  const handleFile = (file: File, type: 'passport' | 'contract') => {
    if (type === 'passport') {
      if (passportPreview && passportPreview.startsWith('blob:')) clearPreview(passportPreview)
      setPassportFile(file)
      setPassportPreview(createFilePreview(file))
    } else {
      if (contractPreview && contractPreview.startsWith('blob:')) clearPreview(contractPreview)
      setContractFile(file)
      setContractPreview(createFilePreview(file))
    }
  }

  const removeFile = (fileType: 'passportFile' | 'contractFile') => {
    if (fileType === 'passportFile') {
      if (passportPreview?.startsWith('blob:')) clearPreview(passportPreview)
      setPassportFile(null)
      setPassportPreview(null)
    } else {
      if (contractPreview?.startsWith('blob:')) clearPreview(contractPreview)
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
        contractDocPath = undefined
      }

      const employeeData = {
        name: employee.name,
        login: employee.login || undefined,
        password: employee.password || undefined,
        cities: selectedCities,
        statusWork: employee.statusWork,
        note: employee.note || undefined,
        tgId: employee.tgId || undefined,
        chatId: employee.chatId || undefined,
        passportDoc: passportDocPath,
        contractDoc: contractDocPath,
      }
      
      const updatedEmployee = await apiClient.updateEmployee(employee.id, employeeData)
      
      setEmployee(prev => prev ? { ...updatedEmployee, password: prev.password } : updatedEmployee)
      setSelectedCities(updatedEmployee.cities)
      
      if (employeeData.password) setHasPassword(true)
      
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
      
      setPassportFile(null)
      setContractFile(null)
      
      toast.success('Изменения успешно сохранены')
      setTimeout(() => router.push('/employees'), 500)
      
    } catch (error) {
      logger.error('Ошибка при обновлении сотрудника', error)
      setError(error instanceof Error ? error.message : 'Ошибка при обновлении сотрудника')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-[#f5f5f0]'}`}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !employee) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-[#f5f5f0]'}`}>
        <div className="text-red-500 text-lg">Ошибка: {error}</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-[#f5f5f0]'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Сотрудник не найден</div>
      </div>
    )
  }

  const statusOptions = [
    { value: 'работает', label: 'Работает', color: 'text-green-500' },
    { value: 'уволен', label: 'Уволен', color: 'text-red-500' },
    { value: 'отпуск', label: 'Отпуск', color: 'text-yellow-500' },
    { value: 'больничный', label: 'Больничный', color: 'text-orange-500' },
  ]

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-[#f5f5f0]'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/employees')}
            className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </button>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Редактирование сотрудника
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
                    value={employee.name}
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

                {/* Логин */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Логин
                  </Label>
                  <div className="flex gap-3">
                    <CustomInput
                      name="login"
                      value={employee.login || ''}
                      onChange={handleInputChange}
                      placeholder="Введите логин"
                      className={`flex-1 h-12 border-0 rounded-lg focus:ring-2 focus:ring-[#0d5c4b] ${
                        isDark 
                          ? 'bg-[#1e2530] text-gray-100 placeholder:text-gray-500' 
                          : 'bg-[#f5f5f0] text-gray-800 placeholder:text-gray-400'
                      }`}
                    />
                    <Button
                      type="button"
                      onClick={generateLogin}
                      className="h-12 px-4 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg"
                      title="Сгенерировать"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Пароль */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Пароль {hasPassword && <span className="text-xs text-green-500">(установлен)</span>}
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <CustomInput
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={employee.password || ''}
                        onChange={handleInputChange}
                        placeholder={hasPassword ? "Введите новый для изменения" : "Введите пароль"}
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
                      className="h-12 px-4 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg"
                      title="Сгенерировать"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Город и Статус */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Город */}
                  <div>
                    <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Город *
                    </Label>
                    {availableCities.length === 0 ? (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                        <p className="text-yellow-600 dark:text-yellow-400 text-sm">Нет доступных городов</p>
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
                            {selectedCities.length === 0 ? 'Выберите' : `${selectedCities.length} выбрано`}
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
                          <span key={city} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-[#0d5c4b] text-white">
                            {city}
                            <button type="button" onClick={() => removeCity(city)} className="hover:text-red-300">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Статус */}
                  <div>
                    <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Статус
                    </Label>
                    <div className="relative" ref={statusDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                        className={`w-full h-12 rounded-lg px-4 text-left flex items-center justify-between focus:ring-2 focus:ring-[#0d5c4b] focus:outline-none ${
                          isDark 
                            ? 'bg-[#1e2530] text-gray-100' 
                            : 'bg-[#f5f5f0] text-gray-800'
                        }`}
                      >
                        <span>{employee.statusWork}</span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${isDark ? 'text-gray-500' : 'text-gray-400'} ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isStatusDropdownOpen && (
                        <div className={`absolute z-50 w-full mt-2 rounded-lg shadow-lg overflow-hidden ${
                          isDark ? 'bg-[#2a3441] border border-[#3d4a5c]' : 'bg-white border border-gray-200'
                        }`}>
                          {statusOptions.map((status) => (
                            <div
                              key={status.value}
                              className={`px-4 py-3 cursor-pointer transition-colors ${
                                isDark ? 'hover:bg-[#3d4a5c]' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleStatusChange(status.value)}
                            >
                              <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{status.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Заметка */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Заметка
                  </Label>
                  <CustomInput
                    name="note"
                    value={employee.note || ''}
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
                      name="tgId"
                      value={employee.tgId || ''}
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
                      value={employee.chatId || ''}
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
              </div>
            )}

            {/* Вкладка "Документы" */}
            {activeTab === 'documents' && (
              <div className="space-y-5">
                {/* Паспорт */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Фото паспорта
                  </Label>
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      passportDragOver
                        ? 'border-[#0d5c4b] bg-[#0d5c4b]/10'
                        : passportPreview
                          ? 'border-green-500/50 bg-green-500/5'
                          : isDark ? 'border-[#3d4a5c] hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setPassportDragOver(true) }}
                    onDragLeave={() => setPassportDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setPassportDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFile(file, 'passport')
                    }}
                  >
                    {passportPreview ? (
                      <div className="space-y-3">
                        <img
                          src={passportPreview}
                          alt="Паспорт"
                          className="mx-auto max-w-full max-h-48 object-contain rounded-lg cursor-pointer hover:opacity-80"
                          onClick={async () => {
                            let viewUrl = passportPreview
                            if (!passportPreview.startsWith('blob:') && employee.passportDoc) {
                              viewUrl = await getSignedUrl(employee.passportDoc)
                            }
                            window.open(viewUrl, '_blank')
                          }}
                        />
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {passportFile?.name || 'Загруженный файл'}
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              let downloadUrl = passportPreview
                              if (!passportPreview.startsWith('blob:') && employee.passportDoc) {
                                downloadUrl = await getSignedUrl(employee.passportDoc)
                              }
                              const link = document.createElement('a')
                              link.href = downloadUrl
                              link.download = passportFile?.name || 'passport'
                              link.click()
                            }}
                            className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => removeFile('passportFile')}
                            className="h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'passport')
                          }}
                        />
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {passportDragOver ? 'Отпустите файл' : 'Перетащите или выберите файл'}
                        </p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          PDF, JPG, PNG до 50MB
                        </p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Договор */}
                <div>
                  <Label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Договор
                  </Label>
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      contractDragOver
                        ? 'border-[#0d5c4b] bg-[#0d5c4b]/10'
                        : contractPreview
                          ? 'border-green-500/50 bg-green-500/5'
                          : isDark ? 'border-[#3d4a5c] hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setContractDragOver(true) }}
                    onDragLeave={() => setContractDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setContractDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFile(file, 'contract')
                    }}
                  >
                    {contractPreview ? (
                      <div className="space-y-3">
                        <img
                          src={contractPreview}
                          alt="Договор"
                          className="mx-auto max-w-full max-h-48 object-contain rounded-lg cursor-pointer hover:opacity-80"
                          onClick={async () => {
                            let viewUrl = contractPreview
                            if (!contractPreview.startsWith('blob:') && employee.contractDoc) {
                              viewUrl = await getSignedUrl(employee.contractDoc)
                            }
                            window.open(viewUrl, '_blank')
                          }}
                        />
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {contractFile?.name || 'Загруженный файл'}
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              let downloadUrl = contractPreview
                              if (!contractPreview.startsWith('blob:') && employee.contractDoc) {
                                downloadUrl = await getSignedUrl(employee.contractDoc)
                              }
                              const link = document.createElement('a')
                              link.href = downloadUrl
                              link.download = contractFile?.name || 'contract'
                              link.click()
                            }}
                            className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => removeFile('contractFile')}
                            className="h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'contract')
                          }}
                        />
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {contractDragOver ? 'Отпустите файл' : 'Перетащите или выберите файл'}
                        </p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          PDF, JPG, PNG до 50MB
                        </p>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                onClick={() => router.push('/employees')}
                disabled={isUpdating}
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
                disabled={isUpdating || availableCities.length === 0}
                className="flex-1 h-12 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Сохранение...
                  </span>
                ) : (
                  'Сохранить изменения'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeViewPage() {
  return <EmployeeViewContent />
}
