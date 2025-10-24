'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import React, { useEffect, useLayoutEffect } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = React.memo<ClientLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const isLogoutPage = pathname === '/logout'

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

  if (isLoginPage || isLogoutPage) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <CustomNavigation />
      <main className="pt-16 md:pt-0 md:ml-64">{children}</main>
    </ErrorBoundary>
  )
})

ClientLayout.displayName = 'ClientLayout'

export default ClientLayout
