'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import AuthGuard from '@/components/auth-guard'
import React, { useEffect, useLayoutEffect } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = React.memo<ClientLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const isLogoutPage = pathname === '/logout'
  const isPublicPage = isLoginPage || isLogoutPage

  // Принудительно скроллим в начало при смене страницы
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Дополнительная проверка после рендера
  useEffect(() => {
    // Небольшая задержка для гарантии, что DOM обновился
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 0)
    
    return () => clearTimeout(timer)
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
