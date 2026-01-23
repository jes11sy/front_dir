'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const isAuth = await apiClient.isAuthenticated()
        if (!isMounted) return

        if (!isAuth) {
          router.push('/login')
        } else {
          router.push('/orders')
        }
      } catch {
        if (isMounted) {
          router.push('/login')
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  // Показываем loading во время редиректа
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="text-white text-xl">
        {isChecking ? 'Проверка авторизации...' : 'Перенаправление...'}
      </div>
    </div>
  )
}
