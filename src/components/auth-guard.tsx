'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { useAuthStore } from '@/store/auth.store'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()
  const hasCheckedAuth = useRef(false)
  const { setUser } = useAuthStore()

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
        
        const userData = await Promise.race([apiClient.getProfile(), timeoutPromise])
        
        if (isMounted) {
          setUser(userData) // Сохраняем данные пользователя в store
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
        
        // Сессия недействительна (cookies удалены iOS ITP или PWA)
        // Пробуем восстановить через refresh token из IndexedDB
        logger.debug('Cookies invalid, trying to restore from IndexedDB')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        
        if (restored) {
          logger.debug('Session restored from IndexedDB')
          // Загружаем данные пользователя после восстановления сессии
          try {
            const userData = await apiClient.getProfile()
            if (isMounted) {
              setUser(userData)
            }
          } catch {
            logger.debug('Failed to load user data after session restore')
          }
          if (isMounted) {
            setIsAuthenticated(true)
            setAuthError(null)
          }
        } else {
          // Не удалось восстановить — редирект на логин
          logger.debug('Could not restore session, redirecting to login')
          if (errorMessage !== 'SESSION_EXPIRED') {
            await apiClient.logout()
          }
          if (isMounted) router.push('/login')
        }
      } finally {
        if (isMounted) setIsLoading(false)
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
    return <LoadingScreen message="Проверка авторизации" />
  }

  // Показываем ошибку сети с возможностью повторить
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center max-w-md mx-auto px-4">
          {/* Иконка ошибки сети */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="text-white text-xl mb-2 font-medium">Нет подключения</div>
          <div className="text-white/70 text-sm mb-6">{authError}</div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-medium 
                       hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
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
