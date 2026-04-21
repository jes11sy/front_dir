'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { apiClient } from '@/lib/api'
import { getSignedUrl } from '@/lib/s3-utils'
import { User, Edit2, LogOut, Eye, EyeOff, Save, X, Loader2, Settings, FileText, Upload, Smartphone, Share, Plus, Home } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Форма редактирования
  const [formData, setFormData] = useState({
    name: user?.name || '',
    note: user?.note || '',
    telegramId: ''
  })
  
  // Документы
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const [passportPreview, setPassportPreview] = useState<string | null>(null)
  const [showDocuments, setShowDocuments] = useState(false)
  
  // Форма смены пароля
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Push настройки
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showPWAInstructions, setShowPWAInstructions] = useState(false)
  const [disabledCities, setDisabledCities] = useState<string[]>([])
  const [disabledTypes, setDisabledTypes] = useState<string[]>([])

  // PWA установка
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstallPWA, setCanInstallPWA] = useState(false)

  // Типы уведомлений для директора
  const notificationTypes = [
    { id: 'order_new', label: 'Новый заказ' },
    { id: 'order_accepted', label: 'Заказ принят' },
    { id: 'order_rescheduled', label: 'Заказ перенесен' },
    { id: 'order_rejected', label: 'Незаказ' },
    { id: 'order_refusal', label: 'Отказ' },
    { id: 'order_closed', label: 'Заказ закрыт' },
    { id: 'order_modern', label: 'Заказ в модерн' },
  ]

  // Push Notifications
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    isLoading: pushLoading,
    error: pushError,
    isSubscribing,
    isUnsubscribing,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isIOSPWARequired,
    isIOS,
  } = usePushNotifications()

  // Загрузка профиля с документами
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const profile = await apiClient.getCurrentUserProfile()
        if (profile) {
          setFormData({
            name: profile.name || '',
            note: profile.note || '',
            telegramId: profile.tgId || ''
          })
          
          // Загружаем превью документов
          if ((profile as any).contract) {
            const contractUrl = await getSignedUrl((profile as any).contract)
            setContractPreview(`${contractUrl}?t=${Date.now()}`)
          }
          if ((profile as any).passport) {
            const passportUrl = await getSignedUrl((profile as any).passport)
            setPassportPreview(`${passportUrl}?t=${Date.now()}`)
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

  useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#profile-settings') return
    const id = requestAnimationFrame(() => {
      document.getElementById('profile-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [loading])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await apiClient.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user?.name || '',
      note: user?.note || '',
      telegramId: formData.telegramId
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      let contractDocPath = contractPreview && !contractPreview.startsWith('blob:') ? contractPreview.split('?')[0] : ''
      let passportDocPath = passportPreview && !passportPreview.startsWith('blob:') ? passportPreview.split('?')[0] : ''

      // Загружаем новые файлы
      if (contractFile) {
        const result = await apiClient.uploadDirectorContract(contractFile)
        contractDocPath = result.filePath
      }
      if (passportFile) {
        const result = await apiClient.uploadDirectorPassport(passportFile)
        passportDocPath = result.filePath
      }

      // Обновляем профиль
      await apiClient.updateUserProfile({
        telegramId: formData.telegramId,
        contract: contractDocPath || undefined,
        passport: passportDocPath || undefined
      })

      // Обновляем localStorage
      const updatedUser = await apiClient.getCurrentUserProfile()
      if (updatedUser) {
        const { sanitizeObject } = await import('@/lib/sanitize')
        localStorage.setItem('user', JSON.stringify(sanitizeObject(updatedUser as Record<string, unknown>)))
      }

      setIsEditing(false)
      setContractFile(null)
      setPassportFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFile = (file: File, type: 'contract' | 'passport') => {
    if (file.size > 50 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 50MB)')
      return
    }
    
    if (type === 'contract') {
      if (contractPreview?.startsWith('blob:')) URL.revokeObjectURL(contractPreview)
      setContractFile(file)
      setContractPreview(URL.createObjectURL(file))
    } else {
      if (passportPreview?.startsWith('blob:')) URL.revokeObjectURL(passportPreview)
      setPassportFile(file)
      setPassportPreview(URL.createObjectURL(file))
    }
    setError(null)
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов')
      return
    }
    
    setIsSaving(true)
    try {
      // TODO: Implement password change API
      // await apiClient.changePassword(passwordData)
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('Ошибка смены пароля')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Получаем инициалы для аватара
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const cities = user?.cities || []

  // Определяем тип устройства для инструкций
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)

  // Функция установки PWA
  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available')
      // Если нет deferred prompt, просто закрываем модалку - пользователь должен следовать инструкциям
      setShowPWAInstructions(false)
      return
    }

    try {
      console.log('[PWA] Showing install prompt')
      // Показываем нативный промпт установки
      deferredPrompt.prompt()
      
      // Ждем ответа пользователя
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] User choice:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt')
      } else {
        console.log('[PWA] User dismissed the install prompt')
      }
      
      // Очищаем deferred prompt
      setDeferredPrompt(null)
      setCanInstallPWA(false)
      
    } catch (error) {
      console.error('[PWA] Error during installation:', error)
      // В случае ошибки просто закрываем модалку
      setShowPWAInstructions(false)
    }
  }

  // Функция для обработки клика по переключателю push
  const handlePushToggle = async () => {
    // Если push не поддерживается - показываем инструкции
    if (!pushSupported) {
      setShowPWAInstructions(true)
      return
    }

    // Обычная логика включения/выключения
    if (pushSubscribed) {
      await unsubscribePush()
    } else {
      await subscribePush()
    }
  }

  // Загрузка настроек push-уведомлений
  useEffect(() => {
    const loadPushSettings = async () => {
      const savedDisabledCities = localStorage.getItem('director-push-disabled-cities')
      const savedDisabledTypes = localStorage.getItem('director-push-disabled-types')
      
      if (savedDisabledCities) {
        try {
          const cities = JSON.parse(savedDisabledCities)
          setDisabledCities(cities)
          // Синхронизируем с IndexedDB
          await saveToIndexedDB('director-push-disabled-cities', savedDisabledCities)
        } catch (e) {
          console.warn('Failed to parse disabled cities:', e)
        }
      }
      
      if (savedDisabledTypes) {
        try {
          const types = JSON.parse(savedDisabledTypes)
          setDisabledTypes(types)
          // Синхронизируем с IndexedDB
          await saveToIndexedDB('director-push-disabled-types', savedDisabledTypes)
        } catch (e) {
          console.warn('Failed to parse disabled types:', e)
        }
      }
    }

    loadPushSettings()
  }, [])

  // Отслеживание события beforeinstallprompt для PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired')
      // Предотвращаем автоматический показ браузерного промпта
      e.preventDefault()
      // Сохраняем событие для использования позже
      setDeferredPrompt(e)
      setCanInstallPWA(true)
    }

    const handleAppInstalled = () => {
      console.log('[PWA] App installed')
      setDeferredPrompt(null)
      setCanInstallPWA(false)
      setShowPWAInstructions(false)
      // Можно показать уведомление об успешной установке
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Функция сохранения в IndexedDB для Service Worker
  const saveToIndexedDB = async (key: string, value: string) => {
    try {
      const request = indexedDB.open('director-settings', 1)
      
      return new Promise<void>((resolve, reject) => {
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['settings'], 'readwrite')
          const store = transaction.objectStore('settings')
          
          store.put({ key, value })
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
        }
        
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }
        }
      })
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error)
    }
  }

  // Управление настройками городов
  const handleCityToggle = async (city: string, enabled: boolean) => {
    const newDisabledCities = enabled 
      ? disabledCities.filter(c => c !== city)
      : [...disabledCities, city]
    
    setDisabledCities(newDisabledCities)
    const citiesJson = JSON.stringify(newDisabledCities)
    localStorage.setItem('director-push-disabled-cities', citiesJson)
    await saveToIndexedDB('director-push-disabled-cities', citiesJson)
  }

  // Управление настройками типов уведомлений
  const handleTypeToggle = async (type: string, enabled: boolean) => {
    const newDisabledTypes = enabled
      ? disabledTypes.filter(t => t !== type)
      : [...disabledTypes, type]
    
    setDisabledTypes(newDisabledTypes)
    const typesJson = JSON.stringify(newDisabledTypes)
    localStorage.setItem('director-push-disabled-types', typesJson)
    await saveToIndexedDB('director-push-disabled-types', typesJson)
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
        <div className="px-4 py-6">
          <LoadingState isDark={isDark} message="Загрузка профиля..." fullPage />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
        <div className="px-4 py-6">
          <NetworkError
            isDark={isDark}
            onRetry={() => window.location.reload()}
            title="Ошибка загрузки профиля"
            message={error}
            buttonText="Обновить"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Шапка профиля */}
          <div className={`flex items-start justify-between rounded-[20px] border px-5 py-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-medium ${isDark ? 'bg-white/[0.12]' : 'bg-[#0a4f42]'}`}>
                {user?.name ? getInitials(user.name) : <User className="w-8 h-8" />}
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`text-xl bg-transparent border-b focus:outline-none ${isDark ? 'focus:border-gray-600 text-gray-100 border-gray-600' : 'focus:border-teal-500 text-gray-900 border-gray-300'}`}
                  />
                ) : (
                  <h2 className={`text-[20px] font-semibold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name || 'Пользователь'}</h2>
                )}
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{user?.login}</p>
                {user?.role && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${isDark ? 'bg-white/[0.1] text-gray-200' : 'bg-[#0a4f42]/10 text-[#0a4f42]'}`}>
                    {user.role === 'director' ? 'Директор' : user.role}
                  </span>
                )}
              </div>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEdit} 
                className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 active:text-gray-200' : 'text-gray-400 hover:text-gray-600 active:text-gray-700'}`}
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancel} 
                  className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`transition-colors disabled:opacity-50 ${isDark ? 'text-gray-300 hover:text-white active:text-gray-200' : 'text-gray-700 hover:text-gray-900 active:text-black'}`}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {/* Информация */}
              <div className={`rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>
                  Контакт и профиль
                </p>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Города</span>
                  <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{cities.length > 0 ? cities.join(', ') : 'Не указаны'}</span>
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Дата регистрации</span>
                  <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                    {user?.createdAt ? formatDate(user.createdAt) : 'Не указана'}
                  </span>
                </div>
                <div className={`flex justify-between items-start py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Примечание</span>
                  {isEditing ? (
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className={`w-64 text-right bg-transparent border rounded-lg p-2 focus:outline-none resize-none ${isDark ? 'focus:border-gray-600 text-gray-200 border-gray-600' : 'focus:border-teal-500 text-gray-900 border-gray-200'}`}
                      rows={2}
                    />
                  ) : (
                    <span className={`text-right max-w-xs ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{user?.note || 'Не указано'}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Telegram</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.telegramId}
                      onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                      className={`w-64 text-right bg-transparent border-b focus:outline-none ${isDark ? 'focus:border-gray-600 text-gray-200 border-gray-600' : 'focus:border-teal-500 text-gray-900 border-gray-300'}`}
                      placeholder="@username"
                    />
                  ) : (
                    <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{formData.telegramId || 'Не указан'}</span>
                  )}
                </div>

                <div className={`py-2.5 ${isDark ? 'border-white/10' : 'border-black/[0.06]'}`}>
                  <button
                    onClick={() => setShowDocuments(!showDocuments)}
                    className={`w-full flex justify-between items-center transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 active:text-gray-100' : 'text-gray-500 hover:text-gray-700 active:text-gray-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Документы</span>
                    </div>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showDocuments ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {showDocuments && (
                    <div className="mt-3 grid gap-3 pl-2 sm:grid-cols-2">
                      <div>
                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Договор</label>
                        {contractPreview ? (
                          <div className="mt-1 flex items-center gap-2">
                            <a href={contractPreview} target="_blank" rel="noopener noreferrer" className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300 hover:text-white' : 'text-[#0a4f42] hover:text-[#083f35]'}`}>
                              📄 Просмотр
                            </a>
                            {isEditing && (
                              <button
                                onClick={() => {
                                  if (contractPreview.startsWith('blob:')) URL.revokeObjectURL(contractPreview)
                                  setContractFile(null)
                                  setContractPreview(null)
                                }}
                                className={`text-xs ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : isEditing ? (
                          <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-white active:text-gray-200' : 'text-gray-600 hover:text-gray-800 active:text-gray-900'}`}>
                            <Upload className="h-3 w-3" />
                            <span>Загрузить</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'contract')} />
                          </label>
                        ) : (
                          <div className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Не загружен</div>
                        )}
                      </div>

                      <div>
                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Паспорт</label>
                        {passportPreview ? (
                          <div className="mt-1 flex items-center gap-2">
                            <a href={passportPreview} target="_blank" rel="noopener noreferrer" className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300 hover:text-white' : 'text-[#0a4f42] hover:text-[#083f35]'}`}>
                              📄 Просмотр
                            </a>
                            {isEditing && (
                              <button
                                onClick={() => {
                                  if (passportPreview.startsWith('blob:')) URL.revokeObjectURL(passportPreview)
                                  setPassportFile(null)
                                  setPassportPreview(null)
                                }}
                                className={`text-xs ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : isEditing ? (
                          <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-white active:text-gray-200' : 'text-gray-600 hover:text-gray-800 active:text-gray-900'}`}>
                            <Upload className="h-3 w-3" />
                            <span>Загрузить</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'passport')} />
                          </label>
                        ) : (
                          <div className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Не загружен</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Настройки */}
              <div
                id="profile-settings"
                className={`space-y-4 scroll-mt-24 rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}
              >
                <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>
                  Настройки
                </p>

                <div className={`py-1.5 border-b ${isDark ? 'border-white/10' : 'border-black/[0.06]'}`}>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Push-уведомления</span>
                    <div className="flex items-center gap-3">
                      {pushLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Проверка...</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handlePushToggle}
                            disabled={isSubscribing || isUnsubscribing}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                              isDark ? 'focus:ring-0 focus:ring-offset-0' : 'focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
                            } ${
                              pushSubscribed
                                ? 'bg-teal-600'
                                : !pushSupported
                                  ? isDark ? 'bg-yellow-600/30' : 'bg-yellow-400/30'
                                  : isDark ? 'bg-gray-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full shadow-lg transition-transform duration-200 ease-in-out ${
                                pushSubscribed
                                  ? 'translate-x-6 bg-white'
                                  : !pushSupported
                                    ? 'translate-x-1 bg-yellow-400'
                                    : 'translate-x-1 bg-white'
                              }`}
                            />
                            {(isSubscribing || isUnsubscribing) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-3 w-3 animate-spin text-white" />
                              </div>
                            )}
                          </button>
                          {!pushSupported ? (
                            <button
                              onClick={canInstallPWA ? handleInstallPWA : () => setShowPWAInstructions(true)}
                              className={`text-sm transition-colors ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'}`}
                            >
                              {canInstallPWA ? 'Установить' : 'Как установить?'}
                            </button>
                          ) : pushSubscribed ? (
                            <button
                              onClick={() => setShowPushSettings(!showPushSettings)}
                              className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 active:text-gray-100' : 'text-gray-500 hover:text-gray-700 active:text-gray-800'}`}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {pushSubscribed && showPushSettings && (
                    <div className={`mt-4 space-y-4 pl-4 border-l-2 ${isDark ? 'border-white/10' : 'border-[#0a4f42]/20'}`}>
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Уведомления по городам
                        </h4>
                        <div className="space-y-2">
                          {cities.map((city) => (
                            <label key={city} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!disabledCities.includes(city)}
                                onChange={(e) => handleCityToggle(city, e.target.checked)}
                                className={`w-4 h-4 text-teal-600 border-gray-300 rounded ${isDark ? 'focus:ring-0' : 'focus:ring-teal-500 focus:ring-2'}`}
                              />
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{city}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Типы уведомлений
                        </h4>
                        <div className="space-y-2">
                          {notificationTypes.map((type) => (
                            <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!disabledTypes.includes(type.id)}
                                onChange={(e) => handleTypeToggle(type.id, e.target.checked)}
                                className={`w-4 h-4 text-teal-600 border-gray-300 rounded ${isDark ? 'focus:ring-0' : 'focus:ring-teal-500 focus:ring-2'}`}
                              />
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`py-1.5 ${isDark ? 'border-white/10' : 'border-black/[0.06]'}`}>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className={`w-full rounded-xl px-4 py-2 text-sm transition-colors text-left ${isDark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}
                  >
                    Сменить пароль
                  </button>
                </div>
              </div>

              <div className={`rounded-[20px] border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 transition-colors disabled:opacity-50 ${
                    isDark ? 'bg-white/[0.04] text-red-300 hover:bg-white/[0.08]' : 'bg-white text-red-600 hover:bg-red-50 border border-red-100'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Выход...' : 'Выйти'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 ${isDark ? 'bg-[#111113] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`}>Смена пароля</h3>
              <button
                onClick={() => {
                  setIsChangingPassword(false)
                  setPasswordError(null)
                }}
                className={`rounded-full p-1 transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <div
                  className={`group relative overflow-hidden rounded-2xl border transition-all ${
                    isDark
                      ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                      : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                  }`}
                >
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Текущий пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showCurrentPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <div
                  className={`group relative overflow-hidden rounded-2xl border transition-all ${
                    isDark
                      ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                      : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                  }`}
                >
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Новый пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showNewPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <div
                  className={`group relative overflow-hidden rounded-2xl border transition-all ${
                    isDark
                      ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                      : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                  }`}
                >
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Подтвердите пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{passwordError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsChangingPassword(false)
                    setPasswordError(null)
                  }}
                  className={`flex-1 rounded-full py-2.5 text-sm transition-colors ${isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}
                >
                  Отмена
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving}
                  className={`flex-1 rounded-full py-2.5 text-sm transition-colors disabled:opacity-50 ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'}`}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с инструкциями по установке PWA */}
      {showPWAInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-2xl p-6 border ${isDark ? 'bg-[#111113] border-white/10' : 'bg-white border-black/10'}`}>
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-teal-100'}`}>
                  <Smartphone className={`h-5 w-5 ${isDark ? 'text-white' : 'text-teal-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Установите приложение
                </h3>
              </div>
              <button
                onClick={() => setShowPWAInstructions(false)}
                className={`p-1 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Описание */}
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Для получения push-уведомлений необходимо установить приложение на {isIOS ? 'домашний экран' : 'главный экран'}:
            </p>

            {/* Инструкции */}
            <div className="space-y-4">
              {isIOS ? (
                <>
                  {/* iOS Шаг 1 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      1
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Нажмите кнопку "Поделиться"
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Share className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Внизу экрана в Safari
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* iOS Шаг 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      2
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Выберите "На экран Домой"
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Plus className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          В меню поделиться
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* iOS Шаг 3 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      3
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Нажмите "Добавить"
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Приложение появится на домашнем экране
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Android Шаг 1 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      1
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Нажмите меню браузера
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Settings className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Три точки в правом верхнем углу
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Android Шаг 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      2
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Выберите "Установить приложение"
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Plus className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Или "Добавить на главный экран"
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Android Шаг 3 */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>
                      3
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Подтвердите установку
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Приложение появится на главном экране
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Примечание */}
            <div className={`mt-6 p-3 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                💡 После установки откройте приложение с домашнего экрана и включите уведомления в настройках профиля
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 mt-6">
              {canInstallPWA ? (
                <>
                  <button
                    onClick={() => setShowPWAInstructions(false)}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Позже
                  </button>
                  <button
                    onClick={handleInstallPWA}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Установить сейчас
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowPWAInstructions(false)}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  Понятно
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
