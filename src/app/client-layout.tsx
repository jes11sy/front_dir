'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import AuthGuard from '@/components/auth-guard'
import React, { useLayoutEffect, useMemo } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = React.memo<ClientLayoutProps>(({ children }) => {
  const pathname = usePathname()
  
  const isPublicPage = useMemo(() => {
    return pathname === '/login' || pathname === '/logout'
  }, [pathname])

  // Скроллим в начало при смене страницы (один раз, синхронно)
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Публичные страницы (login, logout) - без AuthGuard
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  // Защищенные страницы - с AuthGuard
  return (
    <ErrorBoundary>
      <AuthGuard>
        <CustomNavigation />
        <main className="pt-16 md:pt-0 md:ml-64">{children}</main>
      </AuthGuard>
    </ErrorBoundary>
  )
})

ClientLayout.displayName = 'ClientLayout'

export default ClientLayout
