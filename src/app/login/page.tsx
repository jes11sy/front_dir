'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      
      // Сохраняем токен в localStorage
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      logger.info('Пользователь успешно авторизован')
      toast.success('Вход выполнен успешно!')
      
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
        <Card className="backdrop-blur-lg shadow-2xl border-0 rounded-2xl" style={{backgroundColor: '#15282f'}}>
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6">
              <Image
                src="/images/logo.png"
                alt="DirCRM Logo"
                width={128}
                height={128}
                className="object-contain"
                priority
              />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login" className="font-medium text-white">Логин</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => setLogin(sanitizeString(e.target.value))}
                  className="bg-white text-slate-800 placeholder:text-slate-500 rounded-xl"
                  style={{borderColor: '#114643'}}
                  required
                  autoComplete="username"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium text-white">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white text-slate-800 placeholder:text-slate-500 rounded-xl"
                  style={{borderColor: '#114643'}}
                  required
                  autoComplete="current-password"
                  maxLength={100}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{accentColor: '#114643'}}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                  Запомнить меня
                </label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl" 
                style={{backgroundColor: '#114643'}}
                disabled={isLoading}
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">
            © 2025 Новые Схемы. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}
