'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { CustomInput } from "@/components/ui/custom-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { sanitizeString } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import { validators, validateField } from "@/lib/validation"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useDesignStore } from "@/store/design.store"

// Компонент формы логина (использует useSearchParams)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const hasCheckedAuth = useRef(false)
  
  // Rate Limiting: защита от брутфорс атак
  const [attemptCount, setAttemptCount] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 10 // Максимум попыток
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 минут в миллисекундах
  
  // Версия дизайна и тема
  const { version, toggleVersion, theme, toggleTheme } = useDesignStore()
  
  /**
   * Безопасная валидация redirect URL
   * Защита от Open Redirect атаки
   */
  const getSafeRedirectUrl = useCallback((): string => {
    const redirect = searchParams.get('redirect')
    
    // Если redirect не указан - дефолтная страница
    if (!redirect) {
      return '/orders'
    }
    
    // Проверяем что это внутренний URL
    // ✅ Разрешено: /orders, /profile, /dashboard
    // ❌ Запрещено: //evil.com, https://evil.com, javascript:alert(1)
    
    // Должен начинаться с /
    if (!redirect.startsWith('/')) {
      logger.warn('Blocked external redirect attempt', { redirect })
      return '/orders'
    }
    
    // НЕ должен начинаться с // (protocol-relative URL)
    if (redirect.startsWith('//')) {
      logger.warn('Blocked protocol-relative redirect', { redirect })
      return '/orders'
    }
    
    // НЕ должен содержать опасные протоколы
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    const lowerRedirect = redirect.toLowerCase()
    if (dangerousProtocols.some(protocol => lowerRedirect.includes(protocol))) {
      logger.warn('Blocked dangerous protocol in redirect', { redirect })
      return '/orders'
    }
    
    // Валидация пройдена - можно редиректить
    return redirect
  }, [searchParams])
  
  // Проверяем авторизацию при загрузке страницы логина
  useEffect(() => {
    // Предотвращаем повторную проверку
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true
    
    const checkAuth = async () => {
      try {
        // 1. Проверяем активную сессию через cookies
        const isAlreadyAuthenticated = await apiClient.isAuthenticated()
        if (isAlreadyAuthenticated) {
          logger.debug('User already authenticated via cookies, redirecting')
          router.replace(getSafeRedirectUrl())
          return
        }
        
        // 2. Cookies не работают — пробуем восстановить через IndexedDB
        logger.debug('Cookies invalid, trying to restore from IndexedDB')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        
        if (restored) {
          logger.debug('Session restored from IndexedDB, redirecting')
          router.replace(getSafeRedirectUrl())
          return
        }
      } catch (error) {
        logger.debug('Auth check failed, showing login form')
      }
      
      // Показываем форму логина
      setIsCheckingAuth(false)
    }
    
    checkAuth()
  }, [router, getSafeRedirectUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем блокировку ПЕРЕД любыми действиями
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000)
      const minutes = Math.floor(remainingSeconds / 60)
      const seconds = remainingSeconds % 60
      toast.error(
        `🔒 Слишком много попыток входа. Попробуйте через ${minutes}:${seconds.toString().padStart(2, '0')}`
      )
      return
    }
    
    // Если блокировка истекла - сбрасываем
    if (blockedUntil && Date.now() >= blockedUntil) {
      setBlockedUntil(null)
      setAttemptCount(0)
    }
    
    setIsLoading(true)
    setErrors({}) // Очищаем предыдущие ошибки
    
    try {
      // Санитизация ввода перед отправкой
      const sanitizedLogin = sanitizeString(login)
      const sanitizedPassword = password // Пароль не санитизируем, но и не логируем
      
      // Валидация логина
      const loginError = validateField(sanitizedLogin, [
        validators.required('Введите логин'),
        validators.minLength(2, 'Логин слишком короткий'),
        validators.maxLength(50, 'Логин слишком длинный'),
      ])
      
      // Валидация пароля (мягкая проверка для входа, строгие требования на backend при создании)
      const passwordError = validateField(sanitizedPassword, [
        validators.required('Введите пароль'),
        validators.minLength(1, 'Пароль не может быть пустым'), // Мягкая проверка - только не пустой
        validators.maxLength(100, 'Максимум 100 символов'),
      ])
      
      // Если есть ошибки валидации - показываем их
      if (loginError || passwordError) {
        setErrors({
          login: loginError || undefined,
          password: passwordError || undefined,
        })
        toast.error(loginError || passwordError || 'Проверьте введенные данные')
        setIsLoading(false)
        return
      }
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword)
      
      // ✅ УСПЕШНЫЙ ВХОД - сбрасываем счетчик попыток
      setAttemptCount(0)
      setBlockedUntil(null)
      
      logger.info('Пользователь успешно авторизован')
      
      // Безопасный редирект (защита от Open Redirect атаки)
      const safeRedirectUrl = getSafeRedirectUrl()
      router.push(safeRedirectUrl)
    } catch (error) {
      // ❌ НЕУДАЧНАЯ ПОПЫТКА - увеличиваем счетчик
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      
      // Проверяем достигнут ли лимит попыток
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const blockTime = Date.now() + BLOCK_DURATION
        setBlockedUntil(blockTime)
        toast.error(
          `🔒 Превышен лимит попыток входа (${MAX_ATTEMPTS}). Аккаунт заблокирован на 5 минут.`
        )
        logger.warn('Login attempts exceeded', { attemptCount: newAttemptCount })
      } else {
        // Показываем сколько попыток осталось
        const remainingAttempts = MAX_ATTEMPTS - newAttemptCount
        const errorMessage = getErrorMessage(error, 'Неверный логин или пароль')
        
        if (errorMessage && !errorMessage.includes('SESSION_EXPIRED')) {
          toast.error(
            `${errorMessage}. Осталось попыток: ${remainingAttempts}`
          )
        }
      }
      
      setIsLoading(false)
    }
  }

  // Показываем экран загрузки во время проверки авторизации
  if (isCheckingAuth) {
    return <LoadingScreen message="Проверка авторизации" />
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative transition-colors duration-300" 
      style={{backgroundColor: theme === 'dark' ? '#1a2e2c' : '#114643'}}
    >
      {/* Верхняя панель с логотипом и переключателями */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Логотип слева */}
          <div className="flex-shrink-0">
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={160}
              height={45}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          {/* Переключатель версий справа */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
            <span 
              className="text-sm font-medium transition-colors"
              style={{color: version === 'v1' ? '#14b8a6' : 'rgba(255,255,255,0.5)'}}
            >
              V1
            </span>
            <button
              onClick={toggleVersion}
              className="relative w-12 h-6 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: version === 'v2' ? '#14b8a6' : 'rgba(255,255,255,0.3)'
              }}
              title={`Переключить на ${version === 'v1' ? 'V2' : 'V1'}`}
            >
              <span
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300"
                style={{
                  transform: version === 'v2' ? 'translateX(24px)' : 'translateX(0)'
                }}
              />
            </button>
            <span 
              className="text-sm font-medium transition-colors"
              style={{color: version === 'v2' ? '#14b8a6' : 'rgba(255,255,255,0.5)'}}
            >
              V2
            </span>
          </div>
        </div>
      </div>

      {/* Форма логина по центру */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <Card className="backdrop-blur-lg shadow-2xl border-0 rounded-2xl bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.02] animate-fade-in">
          {/* Шапка карточки: лого слева, переключатель темы справа */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={120}
              height={35}
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-300"
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
          <CardHeader className="text-center pb-4 pt-2">
            <CardTitle className="text-2xl font-semibold text-gray-800">Авторизация</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 animate-slide-in-left">
                <Label htmlFor="login" className="font-medium text-gray-700 transition-colors duration-200">Логин</Label>
                <CustomInput
                  id="login"
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => {
                    setLogin(sanitizeString(e.target.value))
                    // Очищаем ошибку при вводе
                    if (errors.login) setErrors(prev => ({ ...prev, login: undefined }))
                  }}
                  className={`bg-white text-gray-800 placeholder:text-gray-400 rounded-xl hover:border-gray-300 shadow-sm hover:shadow-md form-input-hover ${
                    errors.login ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  required
                  autoComplete="username"
                  maxLength={50}
                />
                {errors.login && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">
                    {sanitizeString(errors.login)}
                  </p>
                )}
              </div>
              
              <div className="space-y-2 animate-slide-in-right">
                <Label htmlFor="password" className="font-medium text-gray-700 transition-colors duration-200">Пароль</Label>
                <CustomInput
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    // Очищаем ошибку при вводе
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  className={`bg-white text-gray-800 placeholder:text-gray-400 rounded-xl hover:border-gray-300 shadow-sm hover:shadow-md form-input-hover ${
                    errors.password ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  required
                  autoComplete="current-password"
                  maxLength={100}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">
                    {sanitizeString(errors.password)}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                disabled={isLoading || (blockedUntil !== null && Date.now() < blockedUntil)}
              >
                <span className="flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Вход...
                    </>
                  ) : blockedUntil && Date.now() < blockedUntil ? (
                    <>🔒 Заблокировано</>
                  ) : (
                    'Войти'
                  )}
                </span>
              </Button>
              
              {/* Предупреждение о количестве оставшихся попыток */}
              {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !blockedUntil && (
                <div className="text-center mt-2 animate-fade-in">
                  <p className="text-yellow-600 text-sm font-medium">
                    ⚠️ Осталось попыток: {MAX_ATTEMPTS - attemptCount}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        </div>
      </div>

      {/* Футер внизу страницы */}
      <div className="w-full py-4 text-center">
        <p className="text-white/60 text-xs hover:text-white/80 transition-colors duration-200">
          © 2026 Новые Схемы. Все права защищены.
        </p>
      </div>
    </div>
  )
}

// Главный компонент страницы с Suspense (требование Next.js 15 для useSearchParams)
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Загрузка" />}>
      <LoginForm />
    </Suspense>
  )
}
