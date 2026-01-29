'use client'

import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  /** Текст под спиннером */
  message?: string
  /** Показывать логотип */
  showLogo?: boolean
  /** Полноэкранный режим */
  fullScreen?: boolean
}

/**
 * Единый компонент загрузки для всего приложения
 * Используется на:
 * - Странице логина (проверка автовхода)
 * - AuthGuard (проверка сессии)
 * - Suspense fallback
 */
export function LoadingScreen({ 
  message = 'Загрузка...', 
  showLogo = true,
  fullScreen = true 
}: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  // Анимация точек в тексте
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const content = (
    <div className="flex flex-col items-center justify-center">
      {/* Логотип с пульсацией */}
      {showLogo && (
        <div className="mb-8 relative">
          {/* Внешнее свечение */}
          <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl animate-pulse" 
               style={{ transform: 'scale(1.5)' }} />
          
          {/* Круг с буквой */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 
                          flex items-center justify-center shadow-2xl
                          animate-bounce"
               style={{ animationDuration: '2s' }}>
            <span className="text-white text-4xl font-bold tracking-tight">НС</span>
          </div>
        </div>
      )}

      {/* Спиннер */}
      <div className="relative mb-6">
        {/* Внешнее кольцо */}
        <div className="w-16 h-16 rounded-full border-4 border-teal-200/30" />
        
        {/* Вращающееся кольцо */}
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent 
                        border-t-teal-500 border-r-teal-500 animate-spin" />
        
        {/* Внутреннее кольцо (вращается в другую сторону) */}
        <div className="absolute top-2 left-2 w-12 h-12 rounded-full border-4 border-transparent 
                        border-b-emerald-400 border-l-emerald-400 animate-spin"
             style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>

      {/* Текст загрузки */}
      <div className="text-white text-lg font-medium min-w-[140px] text-center">
        {message.replace('...', '')}{dots}
      </div>
      
      {/* Прогресс-бар (декоративный) */}
      <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-loading-bar" />
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: '#114643' }}>
        {content}
      </div>
    )
  }

  return content
}

/**
 * Минимальный спиннер для использования внутри компонентов
 */
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 border-teal-200/30`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent 
                      border-t-teal-500 border-r-teal-500 animate-spin`} />
    </div>
  )
}
