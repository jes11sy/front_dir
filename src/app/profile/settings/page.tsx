"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from "@/components/auth-guard"
import { apiClient } from '@/lib/api'
import { getSignedUrl } from '@/lib/s3-utils'

function SettingsContent() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    cities: '',
    name: '',
    login: '',
    contract: '',
    passport: '',
    telegramId: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const [passportPreview, setPassportPreview] = useState<string | null>(null)
  const [contractDragOver, setContractDragOver] = useState(false)
  const [passportDragOver, setPassportDragOver] = useState(false)
  
  // Максимальный размер файла (50MB для тестирования)
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB в байтах

  // Функция валидации размера файла
  const validateFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`Файл "${file.name}" слишком большой. Размер: ${(file.size / 1024 / 1024).toFixed(2)}MB, Максимальный размер: 50MB`)
      return false
    }
    return true
  }

  // Функция создания превью файла
  const createFilePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  // Функция очистки превью
  const clearPreview = (url: string) => {
    URL.revokeObjectURL(url)
  }

  // Обработка файла
  const handleFile = (file: File, type: 'contract' | 'passport') => {
    if (validateFileSize(file)) {
      if (type === 'contract') {
        if (contractPreview) clearPreview(contractPreview)
        setContractFile(file)
        setSettings({...settings, contract: file.name})
        setContractPreview(createFilePreview(file))
      } else {
        if (passportPreview) clearPreview(passportPreview)
        setPassportFile(file)
        setSettings({...settings, passport: file.name})
        setPassportPreview(createFilePreview(file))
      }
      setError(null)
    }
  }

  // Загружаем данные профиля при монтировании компонента
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Получаем полный профиль пользователя через API
        const profile = await apiClient.getCurrentUserProfile()
        if (profile) {
          setSettings({
            cities: profile.cities?.join(', ') || '',
            name: profile.name || '',
            login: profile.login || '',
            contract: profile.contractDoc || '',
            passport: profile.passportDoc || '',
            telegramId: profile.tgId || ''
          })
          
          // Если есть загруженные файлы, получаем подписанные URL из S3
          if (profile.contractDoc) {
            const contractUrl = await getSignedUrl(profile.contractDoc)
            // Добавляем timestamp для обхода кэша браузера
            const urlWithTimestamp = `${contractUrl}${contractUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
            setContractPreview(urlWithTimestamp)
          }
          if (profile.passportDoc) {
            const passportUrl = await getSignedUrl(profile.passportDoc)
            // Добавляем timestamp для обхода кэша браузера
            const urlWithTimestamp = `${passportUrl}${passportUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
            setPassportPreview(urlWithTimestamp)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки профиля')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      let contractDocPath = settings.contract
      let passportDocPath = settings.passport

      // Загружаем файлы, если они выбраны
      if (contractFile) {
        try {
          const contractResult = await apiClient.uploadDirectorContract(contractFile)
          contractDocPath = contractResult.filePath
        } catch (uploadError) {
          if (uploadError instanceof Error && uploadError.message.includes('too large')) {
            setError('Файл договора слишком большой. Максимальный размер: 50MB')
            return
          }
          throw uploadError
        }
      }

      if (passportFile) {
        try {
          const passportResult = await apiClient.uploadDirectorPassport(passportFile)
          passportDocPath = passportResult.filePath
        } catch (uploadError) {
          if (uploadError instanceof Error && uploadError.message.includes('too large')) {
            setError('Файл паспорта слишком большой. Максимальный размер: 50MB')
            return
          }
          throw uploadError
        }
      }

      // Обновляем профиль с путями к файлам
      // Если файл был удален (settings.contract/passport пустой), передаем undefined
      await apiClient.updateUserProfile({
        telegramId: settings.telegramId,
        contractDoc: settings.contract ? contractDocPath : undefined,
        passportDoc: settings.passport ? passportDocPath : undefined
      })

      
      // Обновляем данные пользователя в localStorage
      const updatedUser = await apiClient.getCurrentUserProfile()
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // Обновляем превью если файлы загружены (получаем подписанные URL)
        if (updatedUser.contractDoc) {
          const contractUrl = await getSignedUrl(updatedUser.contractDoc)
          setContractPreview(contractUrl)
        } else {
          setContractPreview(null)
        }
        if (updatedUser.passportDoc) {
          const passportUrl = await getSignedUrl(updatedUser.passportDoc)
          setPassportPreview(passportUrl)
        } else {
          setPassportPreview(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения настроек')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-lg">Загрузка профиля...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
            
            {/* Навигация */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                ← Назад
              </button>
            </div>

            {/* Заголовок */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Настройки профиля</h1>
              <p className="text-gray-300">Управление настройками вашего аккаунта</p>
            </div>

            {/* Сообщения об ошибках и успехе */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Информация профиля */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Информация профиля</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Города</label>
                    <input
                      type="text"
                      value={settings.cities}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-600 text-gray-300 rounded-lg border border-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Имя</label>
                    <input
                      type="text"
                      value={settings.name}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-600 text-gray-300 rounded-lg border border-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Логин</label>
                    <input
                      type="text"
                      value={settings.login}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-600 text-gray-300 rounded-lg border border-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Telegram ID</label>
                    <input
                      type="text"
                      value={settings.telegramId}
                      onChange={(e) => setSettings({...settings, telegramId: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none transition-colors"
                      onFocus={(e) => (e.target as HTMLElement).style.borderColor = '#2a6b68'}
                      onBlur={(e) => (e.target as HTMLElement).style.borderColor = '#4b5563'}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              {/* Документы */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Документы</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Договор
                      <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
                    </label>
                    
                    {contractPreview ? (
                      /* Превью с кнопками (БЕЗ drag-and-drop) */
                      <div className="border-2 border-green-400 bg-green-900/20 rounded-lg p-6">

                        <div className="space-y-3">
                          <div className="relative">
                            <img 
                              key={contractPreview}
                              src={contractPreview} 
                              alt="Превью договора" 
                              className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={async () => {
                                let viewUrl = contractPreview
                                if (!contractPreview.startsWith('blob:') && settings.contract) {
                                  viewUrl = await getSignedUrl(settings.contract)
                                }
                                window.open(viewUrl, '_blank')
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  let downloadUrl = contractPreview
                                  if (!contractPreview.startsWith('blob:') && settings.contract) {
                                    downloadUrl = await getSignedUrl(settings.contract)
                                  }
                                  const link = document.createElement('a')
                                  link.href = downloadUrl
                                  link.download = contractFile?.name || 'contract'
                                  link.click()
                                }}
                                className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                                title="Скачать файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (contractPreview.startsWith('blob:')) {
                                    clearPreview(contractPreview)
                                  }
                                  setContractFile(null)
                                  setContractPreview(null)
                                  setSettings({...settings, contract: ''})
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
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
                      </div>
                    ) : (
                      /* Drag-and-drop зона (ТОЛЬКО когда нет файла) */
                      <div
                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          contractDragOver 
                            ? 'border-blue-400 bg-blue-900/20' 
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
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'contract')
                          }}
                        />
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-gray-300 text-2xl">📄</span>
                          </div>
                          <div className="text-gray-300 font-medium">
                            {contractDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
                          </div>
                          <div className="text-sm text-gray-400">или нажмите для выбора</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Паспорт
                      <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
                    </label>
                    
                    {passportPreview ? (
                      /* Превью с кнопками (БЕЗ drag-and-drop) */
                      <div className="border-2 border-green-400 bg-green-900/20 rounded-lg p-6">
                        <div className="space-y-3">
                          <div className="relative">
                            <img 
                              key={passportPreview}
                              src={passportPreview} 
                              alt="Превью паспорта" 
                              className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={async () => {
                                let viewUrl = passportPreview
                                if (!passportPreview.startsWith('blob:') && settings.passport) {
                                  viewUrl = await getSignedUrl(settings.passport)
                                }
                                window.open(viewUrl, '_blank')
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  let downloadUrl = passportPreview
                                  if (!passportPreview.startsWith('blob:') && settings.passport) {
                                    downloadUrl = await getSignedUrl(settings.passport)
                                  }
                                  const link = document.createElement('a')
                                  link.href = downloadUrl
                                  link.download = passportFile?.name || 'passport'
                                  link.click()
                                }}
                                className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                                title="Скачать файл"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (passportPreview.startsWith('blob:')) {
                                    clearPreview(passportPreview)
                                  }
                                  setPassportFile(null)
                                  setPassportPreview(null)
                                  setSettings({...settings, passport: ''})
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
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
                      </div>
                    ) : (
                      /* Drag-and-drop зона (ТОЛЬКО когда нет файла) */
                      <div
                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          passportDragOver 
                            ? 'border-blue-400 bg-blue-900/20' 
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
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file, 'passport')
                          }}
                        />
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-gray-300 text-2xl">📄</span>
                          </div>
                          <div className="text-gray-300 font-medium">
                            {passportDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
                          </div>
                          <div className="text-sm text-gray-400">или нажмите для выбора</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-end space-x-4">
                <button 
                  onClick={() => router.push('/profile')}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 text-white rounded transition-colors disabled:opacity-50"
                  style={{backgroundColor: '#2a6b68'}}
                  onMouseEnter={(e) => !saving && ((e.target as HTMLElement).style.backgroundColor = '#1a5a57')}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
