'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'
import { User, Edit2, LogOut, MapPin, Calendar, Eye, EyeOff, Save, X, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Форма редактирования
  const [formData, setFormData] = useState({
    name: user?.name || '',
    note: user?.note || ''
  })
  
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
    setFormData({
      name: user?.name || '',
      note: user?.note || ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user?.name || '',
      note: user?.note || ''
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement profile update API
      // await apiClient.updateProfile(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
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
    <div className="min-h-screen bg-white">
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
                    className="text-xl text-gray-900 bg-transparent border-b border-gray-300 focus:border-teal-500 focus:outline-none"
                  />
                ) : (
                  <h1 className="text-xl text-gray-900">{user?.name || 'Пользователь'}</h1>
                )}
                <p className="text-gray-500">{user?.login}</p>
                {user?.role && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                    {user.role === 'director' ? 'Директор' : user.role}
                  </span>
                )}
              </div>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEdit} 
                className="text-gray-400 hover:text-teal-600 transition-colors"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancel} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          {/* Разделитель */}
          <div className="border-b border-gray-200" />

          {/* Информация */}
          <div className="space-y-4">
            {/* Города */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Города</span>
              <span className="text-gray-900">{cities.length > 0 ? cities.join(', ') : 'Не указаны'}</span>
            </div>

            {/* Дата регистрации */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Дата регистрации</span>
              <span className="text-gray-900">
                {user?.createdAt ? formatDate(user.createdAt) : user?.dateCreate ? formatDate(user.dateCreate) : 'Не указана'}
              </span>
            </div>

            {/* Примечание */}
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-500">Примечание</span>
              {isEditing ? (
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-64 text-right text-gray-900 bg-transparent border border-gray-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none resize-none"
                  rows={2}
                />
              ) : (
                <span className="text-gray-900 text-right max-w-xs">{user?.note || 'Не указано'}</span>
              )}
            </div>
          </div>

          {/* Разделитель */}
          <div className="border-b border-gray-200" />

          {/* Смена пароля */}
          <div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="text-gray-500 hover:text-teal-600 transition-colors text-sm"
            >
              {isChangingPassword ? 'Отмена' : 'Сменить пароль'}
            </button>

            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                {/* Текущий пароль */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Текущий пароль</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-gray-900 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Новый пароль */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-gray-900 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Подтверждение пароля */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Подтвердите пароль</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-gray-900 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Ошибка */}
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
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

          {/* Разделитель */}
          <div className="border-b border-gray-200" />

          {/* Выход */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-start gap-2 text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </button>

        </div>
      </div>
    </div>
  )
}
