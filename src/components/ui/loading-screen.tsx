'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

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
          {/* Внешнее свечение - белое, чтобы контрастировало с зелёным лого */}
          <div className="absolute inset-0 bg-white/15 blur-2xl rounded-full animate-pulse" 
               style={{ transform: 'scale(1.5)' }} />
          
          {/* Логотип */}
          <div className="relative animate-bounce" style={{ animationDuration: '2s' }}>
            <Image 
              src="/images/logo.png" 
              alt="Новые Схемы" 
              width={120} 
              height={120}
              className="drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              priority
            />
          </div>
        </div>
      )}

      {/* Спиннер */}
      <div className="relative mb-6">
        {/* Внешнее кольцо */}
        <div className="w-16 h-16 rounded-full border-4 border-white/20" />
        
        {/* Вращающееся кольцо */}
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent 
                        border-t-white border-r-white/50 animate-spin" />
        
        {/* Внутреннее кольцо (вращается в другую сторону) */}
        <div className="absolute top-2 left-2 w-12 h-12 rounded-full border-4 border-transparent 
                        border-b-white/70 border-l-white/30 animate-spin"
             style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>

      {/* Текст загрузки */}
      <div className="text-white text-lg font-medium min-w-[140px] text-center">
        {message.replace('...', '')}{dots}
      </div>
      
      {/* Прогресс-бар (декоративный) */}
      <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-white/50 to-white rounded-full animate-loading-bar" />
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
 * @param variant - 'light' для тёмного фона, 'dark' для светлого фона
 */
export function LoadingSpinner({ 
  size = 'md', 
  variant = 'light',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorClasses = {
    light: {
      ring: 'border-white/20',
      spinner: 'border-t-white border-r-white/50'
    },
    dark: {
      ring: 'border-gray-300',
      spinner: 'border-t-teal-600 border-r-teal-600/50'
    }
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 ${colorClasses[variant].ring}`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent 
                      ${colorClasses[variant].spinner} animate-spin`} />
    </div>
  )
}
