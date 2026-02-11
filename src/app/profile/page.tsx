'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { apiClient } from '@/lib/api'
import { getSignedUrl } from '@/lib/s3-utils'
import { User, Edit2, LogOut, MapPin, Calendar, Eye, EyeOff, Save, X, Loader2, Settings, Bell, BellOff, FileText, Upload } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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
          if (profile.contractDoc) {
            const contractUrl = await getSignedUrl(profile.contractDoc)
            setContractPreview(`${contractUrl}?t=${Date.now()}`)
          }
          if (profile.passportDoc) {
            const passportUrl = await getSignedUrl(profile.passportDoc)
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
        contractDoc: contractDocPath || undefined,
        passportDoc: passportDocPath || undefined
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        <div className="max-w-2xl space-y-6">
          
          {/* Шапка профиля */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center text-white text-xl font-medium">
                {user?.name ? getInitials(user.name) : <User className="w-8 h-8" />}
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`text-xl bg-transparent border-b focus:border-teal-500 focus:outline-none ${isDark ? 'text-gray-100 border-gray-600' : 'text-gray-900 border-gray-300'}`}
                  />
                ) : (
                  <h1 className={`text-xl ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name || 'Пользователь'}</h1>
                )}
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{user?.login}</p>
                {user?.role && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${isDark ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
                    {user.role === 'director' ? 'Директор' : user.role}
                  </span>
                )}
              </div>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEdit} 
                className={`transition-colors ${isDark ? 'text-gray-500 hover:text-teal-400' : 'text-gray-400 hover:text-teal-600'}`}
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
                  className={`transition-colors disabled:opacity-50 ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Информация */}
          <div className="space-y-4">
            {/* Города */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Города</span>
              <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{cities.length > 0 ? cities.join(', ') : 'Не указаны'}</span>
            </div>

            {/* Дата регистрации */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Дата регистрации</span>
              <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                {user?.createdAt ? formatDate(user.createdAt) : user?.dateCreate ? formatDate(user.dateCreate) : 'Не указана'}
              </span>
            </div>

            {/* Примечание */}
            <div className={`flex justify-between items-start py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Примечание</span>
              {isEditing ? (
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className={`w-64 text-right bg-transparent border rounded-lg p-2 focus:border-teal-500 focus:outline-none resize-none ${isDark ? 'text-gray-200 border-gray-600' : 'text-gray-900 border-gray-200'}`}
                  rows={2}
                />
              ) : (
                <span className={`text-right max-w-xs ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{user?.note || 'Не указано'}</span>
              )}
            </div>

            {/* Telegram ID */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Telegram</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.telegramId}
                  onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                  className={`w-64 text-right bg-transparent border-b focus:border-teal-500 focus:outline-none ${isDark ? 'text-gray-200 border-gray-600' : 'text-gray-900 border-gray-300'}`}
                  placeholder="@username"
                />
              ) : (
                <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{formData.telegramId || 'Не указан'}</span>
              )}
            </div>

            {/* Push-уведомления */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                {pushLoading ? (
                  <>
                    <Bell className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                ) : !pushSupported ? (
                  <>
                    <BellOff className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                ) : (
                  <>
                    {pushSubscribed ? (
                      <Bell className="h-4 w-4 text-green-600" />
                    ) : (
                      <BellOff className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    )}
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pushLoading ? (
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Проверка...</span>
                ) : !pushSupported ? (
                  <span className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {isIOSPWARequired ? 'Нужен PWA' : 'Не поддерживается'}
                  </span>
                ) : (
                  <>
                    <span className={`text-sm ${pushSubscribed ? 'text-green-600' : isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {pushSubscribed ? 'Включены' : 'Отключены'}
                    </span>
                    <button
                      onClick={pushSubscribed ? unsubscribePush : subscribePush}
                      disabled={isSubscribing || isUnsubscribing}
                      className={`text-sm transition-colors disabled:opacity-50 ${
                        isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
                      }`}
                    >
                      {isSubscribing || isUnsubscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : pushSubscribed ? (
                        'Отключить'
                      ) : (
                        'Включить'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Документы */}
            <div className={`py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                onClick={() => setShowDocuments(!showDocuments)}
                className={`w-full flex justify-between items-center transition-colors ${isDark ? 'text-gray-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Документы</span>
                </div>
                <span className="text-sm">{showDocuments ? '▼' : '▶'}</span>
              </button>

              {showDocuments && (
                <div className="mt-3 space-y-3 pl-6">
                  {/* Договор */}
                  <div>
                    <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Договор</label>
                    {contractPreview ? (
                      <div className="mt-1 flex items-center gap-2">
                        <a
                          href={contractPreview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm flex-1 truncate ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                        >
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
                      <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>
                        <Upload className="h-3 w-3" />
                        <span>Загрузить</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'contract')}
                        />
                      </label>
                    ) : (
                      <div className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Не загружен</div>
                    )}
                  </div>

                  {/* Паспорт */}
                  <div>
                    <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Паспорт</label>
                    {passportPreview ? (
                      <div className="mt-1 flex items-center gap-2">
                        <a
                          href={passportPreview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm flex-1 truncate ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                        >
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
                      <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}>
                        <Upload className="h-3 w-3" />
                        <span>Загрузить</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'passport')}
                        />
                      </label>
                    ) : (
                      <div className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Не загружен</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ошибки */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
            </div>
          )}

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Смена пароля */}
          <div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'}`}
            >
              {isChangingPassword ? 'Отмена' : 'Сменить пароль'}
            </button>

            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                {/* Текущий пароль */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Текущий пароль</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-teal-500 focus:outline-none ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Новый пароль */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-teal-500 focus:outline-none ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Подтверждение пароля */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Подтвердите пароль</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-teal-500 focus:outline-none ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Ошибка */}
                {passwordError && (
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{passwordError}</p>
                )}

                {/* Кнопка сохранения */}
                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Сохранить пароль
                </button>
              </div>
            )}
          </div>

          {/* Выход */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center justify-start gap-2 transition-colors disabled:opacity-50 ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </button>

        </div>
      </div>
    </div>
  )
}
