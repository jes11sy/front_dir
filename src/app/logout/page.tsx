"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Выход через API
        await apiClient.logout()
      } catch (error) {
        logger.error('Logout error', error)
      } finally {
        // Перенаправление на страницу входа
        router.push('/login')
      }
    }

    // Сразу выходим без подтверждения
    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border text-center" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Выход из системы</h2>
        <p className="text-gray-300">Пожалуйста, подождите...</p>
      </div>
    </div>
  )
}
