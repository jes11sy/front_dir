'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'

// Ключ для сохранения позиции прокрутки (должен совпадать с orders/page.tsx)
const SCROLL_POSITION_KEY = 'orders_scroll_position'

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/navigate/orders.svg' },
  { 
    name: 'Касса', 
    icon: '/images/navigate/cash.svg',
    dropdown: [
      { name: 'Приход', href: '/cash/income' },
      { name: 'Расход', href: '/cash/expense' },
      { name: 'История', href: '/cash/history' }
    ]
  },
  { 
    name: 'Отчеты', 
    icon: '/images/navigate/reports.svg',
    dropdown: [
      { name: 'Отчет по городу', href: '/reports/city' },
      { name: 'Отчет по мастерам', href: '/reports/masters' }
    ]
  },
  { name: 'Сдача мастеров', href: '/master-handover', icon: '/images/navigate/master-handover.svg' },
  { 
    name: 'Сотрудники', 
    dropdown: [
      { name: 'Мастера', href: '/employees' },
      { name: 'График работы', href: '/employees/schedule' }
    ]
  },
]

export function CustomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const { version, toggleVersion, theme, toggleTheme } = useDesignStore()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    // Выполняем logout асинхронно и ждем завершения
    await apiClient.logout()
    // Перенаправляем на логин только после очистки cookies
    router.push('/login')
  }

  // Переход на главную страницу заказов (сброс всех фильтров и позиции)
  const handleLogoClick = useCallback(() => {
    // Очищаем сохранённую позицию прокрутки
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SCROLL_POSITION_KEY)
    }
    // Переходим на страницу заказов без параметров (чистый URL)
    router.push('/orders')
  }, [router])

  return (
    <>
      {/* Мобильная навигация сверху */}
      <nav 
        className="md:hidden fixed top-0 left-0 right-0 shadow-lg backdrop-blur-lg border-b"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderBottomWidth: '2px',
          zIndex: 9999,
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </button>
          
          <button
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              color: '#374151'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#14b8a6'
              e.currentTarget.style.backgroundColor = '#f0fdfa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#374151'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div 
            className="border-t bg-white max-h-[calc(100vh-64px)] overflow-y-auto"
            style={{
              borderColor: '#14b8a6',
              borderTopWidth: '2px'
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                      style={{
                        color: pathname === item.href ? 'white' : '#374151',
                        backgroundColor: pathname === item.href ? '#14b8a6' : 'transparent',
                        textDecoration: 'none',
                        boxShadow: pathname === item.href ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#14b8a6'
                          e.currentTarget.style.backgroundColor = '#f0fdfa'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#374151'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.dropdown && (
                        <svg className="ml-2 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                        style={{
                          color: expandedDropdown === item.name ? 'white' : '#374151',
                          backgroundColor: expandedDropdown === item.name ? '#14b8a6' : 'transparent',
                          textDecoration: 'none',
                          boxShadow: expandedDropdown === item.name ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (expandedDropdown !== item.name) {
                            e.currentTarget.style.color = '#14b8a6'
                            e.currentTarget.style.backgroundColor = '#f0fdfa'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedDropdown !== item.name) {
                            e.currentTarget.style.color = '#374151'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.dropdown && (
                          <svg 
                            className={`h-4 w-4 transition-transform duration-300 ${
                              expandedDropdown === item.name ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Выпадающий список для мобильных */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className="space-y-1 mt-2">
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg"
                              style={{
                                color: pathname === dropdownItem.href ? 'white' : '#6b7280',
                                backgroundColor: pathname === dropdownItem.href ? '#14b8a6' : 'transparent',
                                textDecoration: 'none',
                                boxShadow: pathname === dropdownItem.href ? '0 1px 2px rgba(20, 184, 166, 0.3)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (pathname !== dropdownItem.href) {
                                  e.currentTarget.style.color = '#14b8a6'
                                  e.currentTarget.style.backgroundColor = '#f0fdfa'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (pathname !== dropdownItem.href) {
                                  e.currentTarget.style.color = '#6b7280'
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }
                              }}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <span className="flex-1 text-left">{dropdownItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Переключатель версий для мобильной версии - только для v1 */}
              {version === 'v1' && (
                <div className="pt-2 mt-2 border-t" style={{borderColor: '#e5e7eb'}}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium" style={{color: '#374151'}}>Версия дизайна</span>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-sm font-medium transition-colors"
                        style={{color: version === 'v1' ? '#14b8a6' : '#9ca3af'}}
                      >
                        V1
                      </span>
                      <button
                        onClick={toggleVersion}
                        className="relative w-12 h-6 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor: version === 'v2' ? '#14b8a6' : '#d1d5db'
                        }}
                        title={`Переключить на ${version === 'v1' ? 'V2' : 'V1'}`}
                      >
                        <span
                          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300"
                          style={{
                            transform: version === 'v2' ? 'translateX(24px)' : 'translateX(0)'
                          }}
                        />
                      </button>
                      <span 
                        className="text-sm font-medium transition-colors"
                        style={{color: version === 'v2' ? '#14b8a6' : '#9ca3af'}}
                      >
                        V2
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Переключатель темы для мобильной версии v2 (iOS стиль) */}
              {version === 'v2' && (
                <div className="pt-2 mt-2 border-t" style={{borderColor: '#e5e7eb'}}>
                  <div className="flex items-center justify-center gap-3 px-4 py-3">
                    {/* Иконка солнца */}
                    <svg 
                      className={`h-5 w-5 transition-colors duration-300 ${theme === 'light' ? 'text-teal-500' : 'text-gray-400'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {/* Переключатель iOS стиль */}
                    <button
                      onClick={toggleTheme}
                      className="relative w-14 h-8 rounded-full transition-colors duration-300 shadow-inner"
                      style={{
                        backgroundColor: theme === 'dark' ? '#14b8a6' : '#e5e7eb'
                      }}
                      title={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
                    >
                      <span
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center"
                        style={{
                          transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)'
                        }}
                      >
                        {theme === 'dark' ? (
                          <svg className="h-4 w-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </button>
                    {/* Иконка луны */}
                    <svg 
                      className={`h-5 w-5 transition-colors duration-300 ${theme === 'dark' ? 'text-teal-500' : 'text-gray-400'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Уведомления для мобильной версии */}
              <div className="pt-2 mt-2 border-t" style={{borderColor: '#e5e7eb'}}>
                <button
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 hover:text-teal-600 hover:bg-teal-50 transition-colors rounded-lg"
                >
                  <div className="relative mr-3">
                    <svg 
                      className="h-5 w-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      3
                    </span>
                  </div>
                  Уведомления
                </button>
              </div>

              {/* Профиль для мобильной версии */}
              <div className="pt-2 mt-2 border-t" style={{borderColor: '#e5e7eb'}}>
                <div className="flex items-center px-4 py-3">
                  <svg 
                    className="mr-3 h-5 w-5 text-gray-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {user?.name || user?.login || 'Профиль'}
                  </span>
                </div>
                <Link
                  href="/profile/settings"
                  className="flex items-center w-full px-4 py-3 pl-12 text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-colors rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Настройки
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center w-full px-4 py-3 pl-12 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Десктопная боковая навигация */}
      <nav 
        className="hidden md:block fixed top-0 left-0 h-full w-64 z-50 shadow-lg backdrop-blur-lg border-r"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderRightWidth: '2px'
        }}
      >
        <div className="flex flex-col h-full">
        {/* Логотип */}
        <div 
          className={`p-6 ${version === 'v2' ? 'flex justify-center' : 'border-b'}`}
          style={version === 'v1' ? {borderColor: '#e5e7eb'} : undefined}
        >
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={version === 'v2' ? 200 : 180}
              height={version === 'v2' ? 56 : 50}
              className={version === 'v2' ? 'h-12 w-auto object-contain' : 'h-10 w-auto object-contain'}
              priority
            />
          </button>
        </div>

        {/* Навигационные элементы */}
        <div className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = item.href ? pathname === item.href : false
              const isExpanded = expandedDropdown === item.name
              
              return (
                <div
                  key={item.name}
                  className="relative"
                >
                  {item.href ? (
                    version === 'v2' ? (
                      // V2: иконка + текст, при выборе иконка зелёная, текст чёрный, при наведении всё зелёное
                      <Link
                        href={item.href}
                        className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                        style={{ textDecoration: 'none' }}
                      >
                        {item.icon && (
                          <Image
                            src={item.icon}
                            alt=""
                            width={20}
                            height={20}
                            className={`mr-3 transition-all duration-200 ${
                              isActive 
                                ? 'brightness-0 saturate-100 [filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)] group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]' 
                                : 'brightness-0 group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]'
                            }`}
                          />
                        )}
                        <span 
                          className={`flex-1 text-left transition-colors duration-200 ${
                            isActive 
                              ? 'text-gray-700 group-hover:text-teal-600' 
                              : 'text-gray-700 group-hover:text-teal-600'
                          }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    ) : (
                      // V1: старый стиль с зелёным фоном
                      <Link
                        href={item.href}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-teal-50 hover:text-teal-600"
                        style={{
                          color: isActive ? 'white' : '#374151',
                          backgroundColor: isActive ? '#14b8a6' : 'transparent',
                          textDecoration: 'none',
                          boxShadow: isActive ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                        }}
                      >
                        <span className="flex-1 text-left">{item.name}</span>
                      </Link>
                    )
                  ) : (
                    <>
                      {version === 'v2' ? (
                        // V2: кнопка с иконкой
                        <button
                          className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg"
                          onClick={() => {
                            setExpandedDropdown(isExpanded ? null : item.name)
                          }}
                        >
                          {item.icon && (
                            <Image
                              src={item.icon}
                              alt=""
                              width={20}
                              height={20}
                              className={`mr-3 transition-all duration-200 ${
                                isExpanded 
                                  ? 'brightness-0 saturate-100 [filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)] group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]' 
                                  : 'brightness-0 group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]'
                              }`}
                            />
                          )}
                          <span 
                            className={`flex-1 text-left transition-colors duration-200 ${
                              isExpanded 
                                ? 'text-gray-700 group-hover:text-teal-600' 
                                : 'text-gray-700 group-hover:text-teal-600'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.dropdown && (
                            <svg 
                              className={`ml-2 h-4 w-4 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''} ${
                                isExpanded 
                                  ? 'text-teal-600 group-hover:text-teal-600' 
                                  : 'text-gray-700 group-hover:text-teal-600'
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        // V1: старый стиль
                        <button
                          className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg hover:bg-teal-50 hover:text-teal-600"
                          style={{
                            color: isExpanded ? 'white' : '#374151',
                            backgroundColor: isExpanded ? '#14b8a6' : 'transparent',
                            textDecoration: 'none'
                          }}
                          onClick={() => {
                            setExpandedDropdown(isExpanded ? null : item.name)
                          }}
                        >
                          <span className="flex-1 text-left">{item.name}</span>
                          {item.dropdown && (
                            <svg 
                              className={`ml-2 h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      {/* Выпадающий список для десктопа (снизу) */}
                      {item.dropdown && isExpanded && (
                        <div className="space-y-1 mt-2">
                          {item.dropdown.map((dropdownItem) => {
                            const isDropdownActive = pathname === dropdownItem.href
                            return version === 'v2' ? (
                              <Link
                                key={dropdownItem.name}
                                href={dropdownItem.href}
                                className="group flex items-center w-full px-4 py-2 pl-11 text-sm transition-all duration-150 rounded-lg"
                                style={{ textDecoration: 'none' }}
                              >
                                <span 
                                  className={`flex-1 text-left transition-colors duration-200 ${
                                    isDropdownActive 
                                      ? 'text-teal-600 group-hover:text-teal-600' 
                                      : 'text-gray-500 group-hover:text-teal-600'
                                  }`}
                                >
                                  {dropdownItem.name}
                                </span>
                              </Link>
                            ) : (
                              <Link
                                key={dropdownItem.name}
                                href={dropdownItem.href}
                                className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg"
                                style={{
                                  color: isDropdownActive ? 'white' : '#6b7280',
                                  backgroundColor: isDropdownActive ? '#14b8a6' : 'transparent',
                                  textDecoration: 'none',
                                  boxShadow: isDropdownActive ? '0 1px 2px rgba(20, 184, 166, 0.3)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDropdownActive) {
                                    e.currentTarget.style.color = '#14b8a6'
                                    e.currentTarget.style.backgroundColor = '#f0fdfa'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isDropdownActive) {
                                    e.currentTarget.style.color = '#6b7280'
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                  }
                                }}
                              >
                                <span className="flex-1 text-left">{dropdownItem.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Переключатель версий для десктопа - только для v1 */}
        {version === 'v1' && (
          <div className="px-4 py-4 border-t" style={{borderColor: '#e5e7eb'}}>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium" style={{color: '#374151'}}>Версия</span>
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm font-medium transition-colors"
                  style={{color: version === 'v1' ? '#14b8a6' : '#9ca3af'}}
                >
                  V1
                </span>
                <button
                  onClick={toggleVersion}
                  className="relative w-12 h-6 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: version === 'v2' ? '#14b8a6' : '#d1d5db'
                  }}
                  title={`Переключить на ${version === 'v1' ? 'V2' : 'V1'}`}
                >
                  <span
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300"
                    style={{
                      transform: version === 'v2' ? 'translateX(24px)' : 'translateX(0)'
                    }}
                  />
                </button>
                <span 
                  className="text-sm font-medium transition-colors"
                  style={{color: version === 'v2' ? '#14b8a6' : '#9ca3af'}}
                >
                  V2
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Переключатель темы для v2 (iOS стиль) */}
        {version === 'v2' && (
          <div className="px-4 py-3 border-t" style={{borderColor: '#e5e7eb'}}>
            <div className="flex items-center justify-center gap-3 px-4 py-2">
              {/* Иконка солнца */}
              <svg 
                className={`h-5 w-5 transition-colors duration-300 ${theme === 'light' ? 'text-teal-500' : 'text-gray-400'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {/* Переключатель iOS стиль */}
              <button
                onClick={toggleTheme}
                className="relative w-14 h-8 rounded-full transition-colors duration-300 shadow-inner"
                style={{
                  backgroundColor: theme === 'dark' ? '#14b8a6' : '#e5e7eb'
                }}
                title={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
              >
                <span
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center"
                  style={{
                    transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)'
                  }}
                >
                  {theme === 'dark' ? (
                    <svg className="h-4 w-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </button>
              {/* Иконка луны */}
              <svg 
                className={`h-5 w-5 transition-colors duration-300 ${theme === 'dark' ? 'text-teal-500' : 'text-gray-400'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
          </div>
        )}

        {/* Уведомления для десктопа */}
        <div className="px-4 py-2">
          <button
            className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-teal-50"
            style={{ color: '#374151' }}
          >
            {/* Иконка колокольчика */}
            <div className="relative mr-3">
              <svg 
                className="h-5 w-5 text-gray-500 group-hover:text-teal-600 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Бейдж с количеством уведомлений */}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </div>
            <span className="flex-1 text-left group-hover:text-teal-600 transition-colors">
              Уведомления
            </span>
          </button>
        </div>

        {/* Профиль с ФИО и выпадающим меню */}
        <div className="px-4 py-4 border-t relative" style={{borderColor: '#e5e7eb'}}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-teal-50"
            style={{ color: '#374151' }}
          >
            {/* Иконка пользователя */}
            <svg 
              className="mr-3 h-5 w-5 text-gray-500 group-hover:text-teal-600 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="flex-1 text-left group-hover:text-teal-600 transition-colors truncate">
              {user?.name || user?.login || 'Профиль'}
            </span>
            <svg 
              className={`ml-2 h-4 w-4 transition-transform duration-200 group-hover:text-teal-600 ${profileMenuOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Выпадающее меню профиля */}
          {profileMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
              <Link
                href="/profile/settings"
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Настройки
              </Link>
              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-t border-gray-100"
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
    </>
  )
}
