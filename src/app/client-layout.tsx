'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import React from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = React.memo<ClientLayoutProps>(({ children }) => {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const isLogoutPage = pathname === '/logout'

  if (isLoginPage || isLogoutPage) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Navigation />
      <main className="pt-16">{children}</main>
    </ErrorBoundary>
  )
})

ClientLayout.displayName = 'ClientLayout'

export default ClientLayout
