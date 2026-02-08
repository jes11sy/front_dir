'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import React from 'react'

// Отдельный компонент для навигации, который НЕ перерендеривается при смене страницы
const NavigationWrapper = React.memo(function NavigationWrapper() {
  const pathname = usePathname()
  
  // Не показываем навигацию на публичных страницах
  const isPublicPage = pathname === '/login' || pathname === '/logout'
  
  if (isPublicPage) {
    return null
  }
  
  return <CustomNavigation />
})

export default NavigationWrapper
