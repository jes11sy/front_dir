'use client'

import Image from 'next/image'
import { useDesignStore } from '@/store/design.store'

interface LoadingScreenProps {
  /** Текст под спиннером (не используется в новом дизайне) */
  message?: string
  /** Полноэкранный режим */
  fullScreen?: boolean
  /** Дополнительные классы */
  className?: string
}

/**
 * Единый компонент загрузки для всего приложения
 * Используется на:
 * - AuthGuard (проверка сессии)
 * - Suspense fallback
 * - Любые полноэкранные загрузки
 * Минималистичный дизайн: только лого и спиннер
 */
export function LoadingScreen({ 
  fullScreen = true,
  className = ''
}: LoadingScreenProps) {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const bgColor = isDark ? 'bg-[#111827]' : 'bg-white'

  const content = (
    <div className="flex flex-col items-center justify-center px-4">
      {/* Логотип */}
      <div className="mb-8">
        <Image 
          src={isDark ? "/images/logo_dark_v2.png" : "/images/logo_light_v2.png"} 
          alt="Новые Схемы" 
          width={200} 
          height={50} 
          className="h-12 w-auto" 
          priority
        />
      </div>

      {/* Спиннер */}
      <div className="relative w-12 h-12">
        <div className={`w-full h-full rounded-full border-4 ${isDark ? 'border-teal-500/20' : 'border-teal-500/20'}`} />
        <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin`} />
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`min-h-screen min-h-[100dvh] flex items-center justify-center transition-colors duration-300 ${bgColor} ${className}`}>
        {content}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center py-12 transition-colors duration-300 ${bgColor} ${className}`}>
      {content}
    </div>
  )
}

/**
 * Минимальный спиннер для использования внутри компонентов
 */
export function LoadingSpinner({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 border-teal-500/20`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-t-teal-500 animate-spin`} />
    </div>
  )
}

/**
 * Состояние загрузки для контента (таблицы, списки и т.д.)
 */
export function LoadingState({ 
  message = 'Загрузка...', 
  size = 'md',
  className = ''
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 ${className}`}>
      <LoadingSpinner size={size} />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

/**
 * Оверлей загрузки поверх контента
 */
export function LoadingOverlay({ 
  isLoading, 
  message, 
  children 
}: { 
  isLoading: boolean
  message?: string
  children: React.ReactNode
}) {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className={`absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 ${
          isDark ? 'bg-[#111827]/80' : 'bg-white/80'
        }`}>
          <LoadingState message={message} />
        </div>
      )}
    </div>
  )
}
