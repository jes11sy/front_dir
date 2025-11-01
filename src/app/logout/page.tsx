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
        // Используем replace для мгновенного перенаправления без истории
        router.replace('/login')
      }
    }

    // Сразу выходим без подтверждения
    handleLogout()
  }, [router])

  // Возвращаем null для мгновенного редиректа
  return null
}
