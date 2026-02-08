'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { useAuthStore } from '@/store/auth.store'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * AuthGuard - компонент защиты маршрутов
 * 
 * ✅ FIX: Не показывает LoadingScreen если пользователь уже есть в store (из persist)
 * Проверка авторизации происходит в фоне, без мерцания UI
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const initRef = useRef(false)
  
  // Используем store для состояния авторизации
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)

  // Устанавливаем колбэк для обработки ошибок авторизации
  useEffect(() => {
    const handleAuthError = () => {
      logger.debug('Auth error callback triggered, redirecting to login')
      router.push('/login')
    }
    
    apiClient.setAuthErrorCallback(handleAuthError)
    
    return () => {
      apiClient.setAuthErrorCallback(() => {})
    }
  }, [router])

  useEffect(() => {
    // Предотвращаем повторную инициализацию
    if (initRef.current) {
      return
    }

    const checkAuth = async () => {
      initRef.current = true
      
      // ✅ FIX: Если пользователь уже есть в store (из persist) - проверяем в фоне без loading
      const hasStoredUser = !!user
      
      if (!hasStoredUser) {
        setLoading(true)
      }

      try {
        // Проверяем валидность сессии через httpOnly cookies
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 15000)
        )
        
        const userData = await Promise.race([apiClient.getProfile(), timeoutPromise])
        setUser(userData)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Проверяем тип ошибки - сетевые ошибки не разлогинивают
        if (errorMessage === 'AUTH_TIMEOUT' || 
            errorMessage.includes('сеть') || 
            errorMessage.includes('network') ||
            errorMessage.includes('Проблемы с сетью')) {
          logger.debug('Network error during auth check, not logging out')
          setLoading(false)
          return
        }
        
        logger.authError('Auth check failed:', errorMessage)
        
        // Пробуем восстановить через refresh token из IndexedDB
        logger.debug('Cookies invalid, trying to restore from IndexedDB')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        
        if (restored) {
          logger.debug('Session restored from IndexedDB')
          try {
            const userData = await apiClient.getProfile()
            setUser(userData)
          } catch {
            logger.debug('Failed to load user data after session restore')
          }
        } else {
          // Не удалось восстановить — редирект на логин
          logger.debug('Could not restore session, redirecting to login')
          if (errorMessage !== 'SESSION_EXPIRED') {
            await apiClient.logout()
          }
          useAuthStore.setState({ user: null, isAuthenticated: false })
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, setUser, setLoading, user])

  // ✅ FIX: Показываем loading ТОЛЬКО если нет сохранённого пользователя
  // Если пользователь есть из persist — показываем контент сразу
  if (isLoading && !user) {
    return <LoadingScreen message="Проверка авторизации" />
  }

  // Если не авторизован и нет пользователя - не показываем контент
  if (!isAuthenticated && !user) {
    return null
  }

  return <>{children}</>
}
