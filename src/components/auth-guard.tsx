'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
}

const isDevelopment = process.env.NODE_ENV === 'development'

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        // Проверяем валидность сессии через httpOnly cookies
        await apiClient.getProfile()
        if (isMounted) {
          setIsAuthenticated(true)
        }
      } catch (error) {
        logger.authError('Auth check failed')
        
        // Сессия недействительна, пробуем автовход через IndexedDB
        const autoLoginSuccess = await tryAutoLogin()
        
        if (!autoLoginSuccess) {
          // Автовход не удался, очищаем локальные данные и перенаправляем на логин
          await apiClient.logout()
          if (isMounted) router.push('/login')
        } else {
          if (isMounted) setIsAuthenticated(true)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const tryAutoLogin = async (): Promise<boolean> => {
      logger.debug('Starting auto-login attempt')

      try {
        const { getSavedCredentials } = await import('@/lib/remember-me')
        const credentials = await getSavedCredentials()

        if (credentials) {
          logger.debug('Found saved credentials', { login: credentials.login })

          // Пытаемся авторизоваться с сохраненными данными
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true
          )

          if (loginResponse && loginResponse.user) {
            logger.debug('Auto-login successful')
            return true
          } else {
            logger.debug('Auto-login failed: invalid response')
          }
        } else {
          logger.debug('No saved credentials found')
        }

        return false
      } catch (error) {
        logger.error('Auto-login failed', error)
        
        // Очищаем невалидные данные
        try {
          const { clearSavedCredentials } = await import('@/lib/remember-me')
          await clearSavedCredentials()
        } catch (e) {
          logger.error('Failed to clear credentials', e)
        }
        
        return false
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
