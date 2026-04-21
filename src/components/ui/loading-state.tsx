import React from 'react'
import Image from 'next/image'

interface LoadingStateProps {
  isDark: boolean
  message?: string
  fullPage?: boolean
}

/** Единый вид: логотип сверху, круговой индикатор снизу (как на экранах входа / LoadingScreen). */
export function LoadingState({
  isDark,
  message: _message = 'Загрузка...',
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      className={`${fullPage ? 'flex min-h-[70vh] items-center justify-center' : 'flex min-h-[56vh] items-center justify-center md:min-h-[60vh]'} animate-fade-in text-center`}
    >
      <div>
        <div className="mb-6 flex justify-center">
          <Image
            src={isDark ? '/images/logo_dark_v2.png' : '/images/logo_light_v2.png'}
            alt="Новые Схемы"
            width={272}
            height={60}
            className="h-[52px] w-auto object-contain opacity-95"
            priority
          />
        </div>
        <div
          className={`mx-auto h-12 w-12 animate-spin rounded-full border-2 border-transparent ${
            isDark ? 'border-b-white' : 'border-b-[#0a4f42]'
          }`}
        />
      </div>
    </div>
  )
}
