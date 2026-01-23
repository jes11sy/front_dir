'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { CustomInput } from "@/components/ui/custom-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { sanitizeString } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { toast } from "@/components/ui/toast"
import { getErrorMessage } from "@/lib/utils"
import { validators, validateField } from "@/lib/validation"

// Компонент формы логина (использует useSearchParams)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true)
  
  // Rate Limiting: защита от брутфорс атак
  const [attemptCount, setAttemptCount] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 10 // Максимум попыток
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 минут в миллисекундах
  
  /**
   * Безопасная валидация redirect URL
   * Защита от Open Redirect атаки
   */
  const getSafeRedirectUrl = (): string => {
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
  }
  
  // Проверяем автовход при загрузке страницы логина
  useEffect(() => {
    const tryAutoLogin = async () => {
      // Минимальное время показа видео загрузки - 3 секунды
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000))
      const startTime = Date.now()
      
      let shouldShowForm = false
      
      try {
        // 1. Быстрая проверка - есть ли сохраненный пользователь в storage
        const savedUser = apiClient.getCurrentUser()
        if (savedUser) {
          // Есть сохраненный пользователь - проверяем сессию через API (с таймаутом)
          try {
            const isAlreadyAuthenticated = await apiClient.isAuthenticated()
            if (isAlreadyAuthenticated) {
              console.log('[Login] User already authenticated via cookies, redirecting...')
              // Ждем минимальное время перед редиректом
              await minLoadingTime
              router.replace(getSafeRedirectUrl())
              return
            } else {
              // Сессия невалидна - очищаем старые данные
              console.log('[Login] Session invalid, clearing old data...')
              sessionStorage.removeItem('user')
              localStorage.removeItem('user')
              shouldShowForm = true
            }
          } catch (error) {
            console.warn('[Login] Auth check failed, clearing data and showing login form:', error)
            // Ошибка проверки - очищаем данные и показываем форму
            sessionStorage.removeItem('user')
            localStorage.removeItem('user')
            shouldShowForm = true
          }
        }
        
        // 2. Если нет активной сессии - пробуем автовход через remember-me
        const { getSavedCredentials } = await import('@/lib/remember-me')
        const credentials = await getSavedCredentials()
        
        if (credentials) {
          console.log('[Login] Found saved credentials, attempting auto-login...')
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Попытка автовхода на странице логина')
            localStorage.setItem('auto_login_last_attempt', new Date().toISOString())
          }
          
          setIsLoading(true)
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true
          )
          
          if (loginResponse && loginResponse.user) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Автовход успешен!')
              localStorage.setItem('auto_login_last_success', new Date().toISOString())
            }
            // Ждем минимальное время перед редиректом
            await minLoadingTime
            router.replace(getSafeRedirectUrl())
            return
          } else {
            console.warn('[Login] Auto-login failed')
            if (typeof window !== 'undefined') {
              localStorage.setItem('auto_login_debug', 'Автовход не удался: неверные данные')
            }
            setIsLoading(false)
            shouldShowForm = true
          }
        } else {
          console.log('[Login] No saved credentials found')
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Нет сохраненных данных для автовхода')
          }
          shouldShowForm = true
        }
      } catch (error) {
        console.error('[Login] Auto-login error:', error)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auto_login_debug', 'Ошибка автовхода: ' + String(error))
        }
        setIsLoading(false)
        shouldShowForm = true
      }
      
      // Если нужно показать форму - ждем минимальное время
      if (shouldShowForm) {
        const elapsed = Date.now() - startTime
        const remaining = 3000 - elapsed
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining))
        }
        setIsCheckingAutoLogin(false)
      }
    }
    
    tryAutoLogin()
  }, [router, searchParams])

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
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword, rememberMe)
      
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

  // Показываем видео загрузки во время проверки автовхода (минимум 3 сек)
  if (isCheckingAutoLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-80 h-80 mx-auto object-contain"
          >
            <source src="/video/loading.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="max-w-md w-full space-y-8 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="backdrop-blur-lg shadow-2xl border-0 rounded-2xl bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.02] animate-fade-in">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 animate-bounce-in">
              <Image
                src="/images/logo.png"
                alt="DirCRM Logo"
                width={128}
                height={128}
                className="object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 hover:scale-105"
                priority
              />
            </div>
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
              
              <div className="flex items-center animate-fade-in-delayed">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-gray-300 focus:ring-2 transition-all duration-200"
                  style={{accentColor: '#114643'}}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 cursor-pointer">
                  Запомнить меня
                </label>
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
        
        <div className="text-center mt-8 animate-fade-in-delayed">
          <p className="text-white/80 text-sm hover:text-white/90 transition-colors duration-200">
            © 2025 Новые Схемы. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}

// Главный компонент страницы с Suspense (требование Next.js 15 для useSearchParams)
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-80 h-80 mx-auto object-contain"
          >
            <source src="/video/loading.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
