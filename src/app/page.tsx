'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Проверяем авторизацию
    if (!apiClient.isAuthenticated()) {
      router.push('/login')
    } else {
      // Если авторизован, редиректим на страницу заказов
      router.push('/orders')
    }
  }, [router])

  // Показываем loading во время редиректа
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="text-white text-xl">Перенаправление...</div>
    </div>
  )
}
