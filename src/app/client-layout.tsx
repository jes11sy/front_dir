'use client'

import { usePathname } from 'next/navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import AuthGuard from '@/components/auth-guard'
import NavigationWrapper from '@/components/navigation-wrapper'
import { useDesignStore } from '@/store/design.store'
import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

// Компонент для синхронизации темы - не зависит от pathname
const ThemeSync = React.memo(function ThemeSync() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
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
  
  return null
})

// Компонент для скролла - зависит от pathname
const ScrollManager = React.memo(function ScrollManager() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  
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
  
  return null
})

// Компонент контента - зависит от pathname для определения публичных страниц
const ContentWrapper = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const pathname = usePathname()
  
  const isPublicPage = useMemo(() => {
    return pathname === '/login' || pathname === '/logout'
  }, [pathname])

  if (isPublicPage) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <main className="main-content pt-16 md:pt-0 md:ml-56 min-h-screen">{children}</main>
    </AuthGuard>
  )
})

ContentWrapper.displayName = 'ContentWrapper'

const ClientLayout = React.memo<ClientLayoutProps>(({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeSync />
      <ScrollManager />
      <NavigationWrapper />
      <ContentWrapper>{children}</ContentWrapper>
    </ErrorBoundary>
  )
})

ClientLayout.displayName = 'ClientLayout'

export default ClientLayout
