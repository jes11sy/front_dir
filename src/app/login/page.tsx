'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { CustomInput } from "@/components/ui/custom-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { sanitizeString } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { toast } from "@/components/ui/toast"

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Санитизация ввода перед отправкой
      const sanitizedLogin = sanitizeString(login)
      const sanitizedPassword = password // Пароль не санитизируем, но и не логируем
      
      if (!sanitizedLogin || !sanitizedPassword) {
        toast.error('Пожалуйста, заполните все поля')
        setIsLoading(false)
        return
      }
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword)
      
      // Сохраняем токены в localStorage
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      logger.info('Пользователь успешно авторизован')
      
      // Перенаправляем на страницу заказов
      router.push('/orders')
    } catch (error) {
      // Показываем toast пользователю, не логируем в консоль (401 - это норма)
      toast.error(error instanceof Error ? error.message : 'Ошибка авторизации')
      setIsLoading(false)
    }
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
                  onChange={(e) => setLogin(sanitizeString(e.target.value))}
                  className="bg-white text-gray-800 placeholder:text-gray-400 rounded-xl hover:border-gray-300 shadow-sm hover:shadow-md form-input-hover"
                  required
                  autoComplete="username"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-2 animate-slide-in-right">
                <Label htmlFor="password" className="font-medium text-gray-700 transition-colors duration-200">Пароль</Label>
                <CustomInput
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white text-gray-800 placeholder:text-gray-400 rounded-xl hover:border-gray-300 shadow-sm hover:shadow-md form-input-hover"
                  required
                  autoComplete="current-password"
                  maxLength={100}
                />
              </div>
              
              <div className="flex items-center animate-fade-in-delayed">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
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
                disabled={isLoading}
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
                  ) : (
                    'Войти'
                  )}
                </span>
              </Button>
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
