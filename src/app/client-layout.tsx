'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import AuthGuard from '@/components/auth-guard'
import { useDesignStore } from '@/store/design.store'
import { ServiceWorkerRegister } from '@/components/push/ServiceWorkerRegister'
import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  
  const theme = useDesignStore((state) => state.theme)
  const hasHydrated = useDesignStore((state) => state._hasHydrated)
  const isDark = theme === 'dark'
  
  const isPublicPage = useMemo(() => {
    return pathname === '/login' || pathname === '/logout'
  }, [pathname])

  // Для несуществующих маршрутов даем отрендериться app/not-found.tsx
  // без перехвата AuthGuard (иначе уводит на /login).
  const isUnknownRoute = useMemo(() => {
    const knownRoutePrefixes = [
      '/login',
      '/logout',
      '/orders',
      '/cash',
      '/reports',
      '/master-handover',
      '/employees',
      '/profile',
    ]

    return !knownRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  }, [pathname])

  const isAuthBypassPage = useMemo(() => {
    return (
      pathname === '/orders' ||
      pathname.startsWith('/cash') ||
      pathname === '/reports' ||
      pathname.startsWith('/reports/') ||
      pathname === '/master-handover' ||
      pathname.startsWith('/master-handover/') ||
      pathname === '/employees' ||
      pathname.startsWith('/employees/') ||
      pathname === '/profile' ||
      pathname.startsWith('/profile/')
    )
  }, [pathname])

  // Синхронно применяем тему к html до отрисовки кадра,
  // чтобы навигация и страница переключались одновременно.
  useLayoutEffect(() => {
    // Не меняем тему до того, как загрузим реальную тему из localStorage
    // Иначе светлая тема "моргнёт" поверх уже примененной из SSR-скрипта тёмной
    if (!hasHydrated) return

    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      html.style.backgroundColor = '#111113'
      html.style.colorScheme = 'dark'
    } else {
      html.classList.remove('dark')
      html.style.backgroundColor = '#f5f5f7'
      html.style.colorScheme = ''
    }
  }, [isDark, hasHydrated])

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

  // Предотвращаем мигание темы, ожидая гидратации хранилища
  const [mounted, setMounted] = React.useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !hasHydrated) {
    return null // Не рендерим контент до применения сохраненной темы
  }

  // Публичные страницы (login, logout) - без AuthGuard и навигации
  if (isPublicPage || isUnknownRoute) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  // Временный bypass авторизации для части страниц
  if (isAuthBypassPage) {
    return (
      <ErrorBoundary>
        <ServiceWorkerRegister />
        <CustomNavigation />
        <main className="main-content pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-28 md:pb-0 md:pt-0 min-h-screen bg-[#f5f5f7] dark:bg-[#111113] transition-colors duration-300">{children}</main>
      </ErrorBoundary>
    )
  }

  // Защищенные страницы
  return (
    <ErrorBoundary>
      <AuthGuard>
        <ServiceWorkerRegister />
        <CustomNavigation />
        <main className="main-content pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-28 md:pb-0 md:pt-0 min-h-screen bg-[#f5f5f7] dark:bg-[#111113] transition-colors duration-300">{children}</main>
      </AuthGuard>
    </ErrorBoundary>
  )
}

export default ClientLayout
