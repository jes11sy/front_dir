'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()
  const hasCheckedAuth = useRef(false)

  // Колбэк для обработки ошибок авторизации (используется в apiClient)
  const handleAuthError = useCallback(() => {
    logger.debug('Auth error callback triggered, redirecting to login')
    router.push('/login')
  }, [router])

  // Устанавливаем колбэк в apiClient при монтировании
  useEffect(() => {
    apiClient.setAuthErrorCallback(handleAuthError)
    
    return () => {
      // Очищаем колбэк при размонтировании
      apiClient.setAuthErrorCallback(() => {})
    }
  }, [handleAuthError])

  useEffect(() => {
    // Предотвращаем повторную проверку
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true
    
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        // Проверяем валидность сессии через httpOnly cookies
        // Таймаут 15 секунд для медленных соединений
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 15000)
        )
        
        await Promise.race([apiClient.getProfile(), timeoutPromise])
        
        if (isMounted) {
          setIsAuthenticated(true)
          setAuthError(null)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Проверяем тип ошибки
        if (errorMessage === 'AUTH_TIMEOUT' || 
            errorMessage.includes('сеть') || 
            errorMessage.includes('network') ||
            errorMessage.includes('Проблемы с сетью')) {
          // Сетевая ошибка - НЕ делаем logout, показываем сообщение
          logger.debug('Network error during auth check, not logging out')
          if (isMounted) {
            setAuthError('Проблемы с сетью. Проверьте подключение к интернету.')
            setIsLoading(false)
          }
          return
        }
        
        logger.authError('Auth check failed:', errorMessage)
        
        // Сессия недействительна, пробуем автовход через IndexedDB
        const autoLoginSuccess = await tryAutoLogin()
        
        if (!autoLoginSuccess) {
          // Автовход не удался, очищаем локальные данные и перенаправляем на логин
          // Не вызываем logout повторно если это SESSION_EXPIRED
          if (errorMessage !== 'SESSION_EXPIRED') {
            await apiClient.logout()
          }
          if (isMounted) router.push('/login')
        } else {
          if (isMounted) {
            setIsAuthenticated(true)
            setAuthError(null)
          }
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

  // Функция для повторной попытки подключения
  const handleRetry = () => {
    hasCheckedAuth.current = false
    setAuthError(null)
    setIsLoading(true)
    // Триггерим перезагрузку через изменение состояния
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </div>
    )
  }

  // Показываем ошибку сети с возможностью повторить
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-yellow-400 text-6xl mb-4">⚠️</div>
          <div className="text-white text-xl mb-4">{authError}</div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-white text-teal-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
