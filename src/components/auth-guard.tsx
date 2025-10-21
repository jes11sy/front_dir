'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        if (!apiClient.isAuthenticated()) {
          if (isMounted) router.push('/login')
          return
        }

        // Проверяем валидность токена
        await apiClient.getProfile()
        if (isMounted) setIsAuthenticated(true)
      } catch (error) {
        logger.authError('Auth check failed')
        // Токен недействителен, очищаем и перенаправляем на логин
        apiClient.logout()
        if (isMounted) router.push('/login')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    checkAuth()
    
    return () => {
      isMounted = false
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
