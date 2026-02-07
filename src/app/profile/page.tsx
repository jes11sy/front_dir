'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'
import { User, Edit2, LogOut, Mail, Phone, Calendar, Building } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    router.push('/profile/settings')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Заголовок */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Профиль</h1>

        {/* Карточка профиля */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Шапка с аватаром */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {user?.name || 'Пользователь'}
                </h2>
                <p className="text-teal-100">
                  {user?.login || 'Логин не указан'}
                </p>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="p-6 space-y-4">
            {user?.email && (
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-gray-400" />
                <span>{user.email}</span>
              </div>
            )}
            
            {user?.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}

            {user?.city && (
              <div className="flex items-center gap-3 text-gray-600">
                <Building className="w-5 h-5 text-gray-400" />
                <span>{user.city}</span>
              </div>
            )}

            {user?.createdAt && (
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>Зарегистрирован: {new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            )}

            {/* Если нет данных */}
            {!user?.email && !user?.phone && !user?.city && (
              <p className="text-gray-500 text-center py-4">
                Информация о профиле не заполнена
              </p>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="px-6 pb-6 space-y-3">
            {/* Кнопка редактирования */}
            <button
              onClick={handleEdit}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
            >
              <Edit2 className="w-5 h-5" />
              Редактировать профиль
            </button>

            {/* Кнопка выхода */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
