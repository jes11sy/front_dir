'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useDesignStore } from '@/store/design.store'
import { Sun, Moon } from 'lucide-react'

const navigationItems = [
  { name: 'Заказы', href: '/orders' },
  { 
    name: 'Касса', 
    dropdown: [
      { name: 'Приход', href: '/cash/income' },
      { name: 'Расход', href: '/cash/expense' },
      { name: 'История', href: '/cash/history' }
    ]
  },
  { 
    name: 'Отчеты', 
    dropdown: [
      { name: 'Отчет по городу', href: '/reports/city' },
      { name: 'Отчет по мастерам', href: '/reports/masters' }
    ]
  },
  { name: 'Сдача мастеров', href: '/master-handover' },
  { 
    name: 'Сотрудники', 
    dropdown: [
      { name: 'Мастера', href: '/employees' },
      { name: 'График работы', href: '/employees/schedule' }
    ]
  },
  { 
    name: 'Профиль', 
    dropdown: [
      { name: 'Настройки', href: '/profile/settings' },
      { name: 'Выйти', href: '/logout' }
    ]
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
  
  // Тема из store
  const { theme, toggleTheme } = useDesignStore()
  const isDark = theme === 'dark'

  return (
    <nav className="nav-main fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-md border-b transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <Link href="/orders" className={`nav-logo text-xl font-bold transition-colors duration-200 hover:text-[#0d5c4b]`}>
            Новые Схемы
          </Link>

          {/* Десктопная навигация */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => {
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout)
                    setHoverTimeout(null)
                  }
                  setHoveredItem(item.name)
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setHoveredItem(null)
                  }, 150)
                  setHoverTimeout(timeout)
                }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`nav-item inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      pathname === item.href
                        ? 'nav-item-active shadow-md shadow-[#0d5c4b]/20'
                        : isDark 
                          ? 'hover:text-white hover:bg-[#2a3441]'
                          : 'hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                    }`}
                  >
                    {item.name}
                    {item.dropdown && (
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                ) : (
                  <div className={`nav-item inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg ${
                    isDark 
                      ? 'hover:text-white hover:bg-[#2a3441]'
                      : 'hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                  }`}>
                    {item.name}
                    {item.dropdown && (
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}
                
                {/* Выпадающий список для десктопа */}
                {item.dropdown && hoveredItem === item.name && (
                  <div 
                    className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden ${
                      isDark 
                        ? 'bg-[#2a3441] border border-[#0d5c4b]/30'
                        : 'bg-white border border-[#0d5c4b]/20'
                    }`}
                    onMouseEnter={() => {
                      if (hoverTimeout) {
                        clearTimeout(hoverTimeout)
                        setHoverTimeout(null)
                      }
                    }}
                    onMouseLeave={() => {
                      const timeout = setTimeout(() => {
                        setHoveredItem(null)
                      }, 150)
                      setHoverTimeout(timeout)
                    }}
                  >
                    <div className="py-2">
                      {item.dropdown.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.name}
                          href={dropdownItem.href}
                          className={`block px-4 py-2.5 text-sm transition-all duration-150 mx-2 rounded-lg ${
                            pathname === dropdownItem.href
                              ? 'text-white bg-[#0d5c4b] shadow-sm'
                              : isDark
                                ? 'text-gray-300 hover:bg-[#1e2530] hover:text-white'
                                : 'text-gray-700 hover:bg-[#daece2]/50 hover:text-[#0d5c4b]'
                          }`}
                        >
                          {dropdownItem.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Переключатель темы */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark 
                ? 'text-[#0d5c4b] hover:text-white hover:bg-[#2a3441]'
                : 'text-[#0d5c4b] hover:bg-[#daece2]/50'
            }`}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Кнопка гамбургер-меню для мобильных */}
          <button
            className={`md:hidden transition-all duration-200 p-2 rounded-lg ${
              isDark 
                ? 'text-gray-300 hover:text-white hover:bg-[#2a3441]'
                : 'text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
            }`}
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
          <div className={`md:hidden border-t ${
            isDark 
              ? 'bg-[#1e2530] border-[#0d5c4b]/30' 
              : 'bg-white border-[#0d5c4b]/20'
          }`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`block px-3 py-2.5 text-base font-medium transition-all duration-200 rounded-lg ${
                        pathname === item.href
                          ? 'text-white bg-[#0d5c4b] shadow-md'
                          : isDark
                            ? 'text-gray-300 hover:text-white hover:bg-[#2a3441]'
                            : 'text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`w-full text-left px-3 py-2.5 text-base font-medium transition-all duration-200 flex items-center justify-between rounded-lg ${
                          expandedDropdown === item.name
                            ? 'text-white bg-[#0d5c4b] shadow-md'
                            : isDark
                              ? 'text-gray-300 hover:text-white hover:bg-[#2a3441]'
                              : 'text-gray-700 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                        }`}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        {item.name}
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
                        <div className={`pl-4 mt-1 space-y-1 ${
                          isDark ? 'border-l-2 border-[#0d5c4b]/30 ml-3' : 'border-l-2 border-[#0d5c4b]/20 ml-3'
                        }`}>
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className={`block px-3 py-2 text-sm transition-all duration-150 rounded-lg ${
                                pathname === dropdownItem.href
                                  ? 'text-white bg-[#0d5c4b] shadow-sm'
                                  : isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-[#2a3441]'
                                    : 'text-gray-600 hover:text-[#0d5c4b] hover:bg-[#daece2]/50'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {dropdownItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
