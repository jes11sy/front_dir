'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
  { name: 'Сотрудники', href: '/employees' },
  { 
    name: 'Профиль', 
    dropdown: [
      { name: 'Настройки', href: '/profile/settings' },
      { name: 'Выйти', href: '/logout' }
    ]
  },
]

export function CustomNavigation() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-lg border-b"
      style={{
        backgroundColor: 'white',
        borderColor: '#14b8a6',
        borderBottomWidth: '2px'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <Link 
            href="/orders" 
            className="text-xl font-bold transition-colors duration-200"
            style={{
              color: '#374151',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#14b8a6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#374151'
            }}
          >
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
                    className="inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg"
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
                  >
                    {item.name}
                    {item.dropdown && (
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                ) : (
                  <div 
                    className="inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg"
                    style={{
                      color: '#374151',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#14b8a6'
                      e.currentTarget.style.backgroundColor = '#f0fdfa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#374151'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
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
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-lg shadow-xl border z-50"
                    style={{
                      backgroundColor: 'white',
                      borderColor: '#14b8a6',
                      borderWidth: '1px'
                    }}
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
                      {item.dropdown.map((dropdownItem, index) => (
                        <Link
                          key={dropdownItem.name}
                          href={dropdownItem.href}
                          className="block px-4 py-2 text-sm transition-all duration-150 rounded mx-2"
                          style={{
                            color: pathname === dropdownItem.href ? 'white' : '#374151',
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
                              e.currentTarget.style.color = '#374151'
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
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

          {/* Кнопка гамбургер-меню для мобильных */}
          <button
            className="md:hidden p-2 rounded-lg transition-all duration-200"
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
            className="md:hidden border-t"
            style={{
              backgroundColor: 'white',
              borderColor: '#14b8a6',
              borderTopWidth: '2px'
            }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item, index) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-base font-medium transition-all duration-200 rounded-lg"
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
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className="w-full text-left px-3 py-2 text-base font-medium transition-all duration-200 flex items-center justify-between rounded-lg"
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
                        <div className="pl-4 space-y-1">
                          {item.dropdown.map((dropdownItem, dropdownIndex) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className="block px-3 py-2 text-sm transition-all duration-150 rounded-lg"
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
