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
      // DEBUG: Логируем начало проверки
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_check_start', new Date().toISOString())
      }

      try {
        // 🍪 Проверяем валидность сессии через httpOnly cookies
        // Если cookies валидны, получим профиль; если нет - 401
        await apiClient.getProfile()
        if (isMounted) {
          setIsAuthenticated(true)
          // DEBUG: Профиль получен успешно
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Профиль получен через cookies (автовход не требуется)')
            localStorage.setItem('auth_check_result', 'success_with_cookies')
          }
        }
      } catch (error) {
        logger.authError('Auth check failed')
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_check_result', 'profile_error_trying_autologin: ' + String(error))
        }
        
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
      console.log('[Auth] Starting auto-login attempt...')
      if (typeof window !== 'undefined') {
        localStorage.setItem('auto_login_last_attempt', new Date().toISOString())
      }

      try {
        const { getSavedCredentials } = await import('@/lib/remember-me')
        console.log('[Auth] Checking for saved credentials...')
        const credentials = await getSavedCredentials()

        if (credentials) {
          console.log('[Auth] Found saved credentials for user:', credentials.login)
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Найдены данные для: ' + credentials.login)
          }

          // Пытаемся авторизоваться с сохраненными данными
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true
          )

          console.log('[Auth] Login response:', loginResponse)

          if (loginResponse && loginResponse.user) {
            // Успешная авторизация
            console.log('[Auth] Auto-login successful')
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Автовход успешен!')
              localStorage.setItem('auto_login_last_success', new Date().toISOString())
            }
            return true
          } else {
            console.warn('[Auth] Login response was not successful')
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Ошибка: неверный ответ сервера')
            }
          }
        } else {
          console.log('[Auth] No saved credentials found')
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Сохраненные данные не найдены')
          }
        }

        return false
      } catch (error) {
        console.error('[Auth] Auto-login failed:', error)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auto_login_debug', 'Ошибка: ' + String(error))
        }
        
        // Очищаем невалидные данные
        try {
          const { clearSavedCredentials } = await import('@/lib/remember-me')
          await clearSavedCredentials()
        } catch (e) {
          console.error('[Auth] Failed to clear credentials:', e)
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
