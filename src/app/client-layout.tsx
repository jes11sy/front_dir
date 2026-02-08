'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import AuthGuard from '@/components/auth-guard'
import { useDesignStore } from '@/store/design.store'
import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  const isPublicPage = useMemo(() => {
    return pathname === '/login' || pathname === '/logout'
  }, [pathname])

  // Синхронизируем класс dark на html элементе при изменении темы
  useEffect(() => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      html.style.backgroundColor = '#1e2530'
      html.style.colorScheme = 'dark'
    } else {
      html.classList.remove('dark')
      html.style.backgroundColor = ''
      html.style.colorScheme = ''
    }
  }, [isDark])

  // Скроллим в начало при смене страницы
  useLayoutEffect(() => {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'
    
    const isBackForward = navigationType === 'back_forward'
    const isOrdersPage = pathname === '/orders' || pathname.startsWith('/orders?')
    
    if (!isBackForward || !isOrdersPage) {
      window.scrollTo(0, 0)
    }
    
    prevPathname.current = pathname
  }, [pathname])

  // Публичные страницы (login, logout) - без AuthGuard и навигации
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  // Защищенные страницы
  return (
    <ErrorBoundary>
      <CustomNavigation />
      <AuthGuard>
        <main className="pt-16 md:pt-0 md:ml-56 min-h-screen bg-white dark:bg-[#1e2530]">{children}</main>
      </AuthGuard>
    </ErrorBoundary>
  )
}

export default ClientLayout
