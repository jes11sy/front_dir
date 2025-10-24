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

export function Navigation() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-lg border-b" style={{backgroundColor: '#15282f', borderColor: '#114643'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <Link href="/orders" className="text-xl font-bold text-white nav-item-hover animate-fade-in-scale hover:text-teal-300 transition-colors duration-300">
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
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-300 nav-item-hover rounded-lg ${
                      pathname === item.href
                        ? 'text-white bg-teal-600/20 border border-teal-500/30'
                        : 'text-white/80 hover:text-white hover:bg-white/10 hover:border hover:border-teal-500/20'
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
                  <div className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-300 nav-item-hover text-white/80 hover:text-white hover:bg-white/10 hover:border hover:border-teal-500/20 cursor-pointer rounded-lg`}>
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
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-lg shadow-xl border border-teal-200 z-50 animate-slide-down"
                    style={{backgroundColor: '#f8fffe', borderColor: '#14b8a6'}}
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
                          className={`block px-4 py-2 text-sm transition-all duration-200 dropdown-hover rounded mx-2 ${
                            pathname === dropdownItem.href
                              ? 'text-white bg-teal-600 border border-teal-500'
                              : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border hover:border-teal-200'
                          }`}
                          style={{
                            animationDelay: `${index * 0.1}s`
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
            className="md:hidden text-white hover:text-teal-300 hover:bg-white/10 transition-all duration-300 nav-item-hover p-2 rounded-lg"
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
          <div className="md:hidden border-t animate-slide-up" style={{borderColor: '#114643'}}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item, index) => (
                <div key={item.name} style={{animationDelay: `${index * 0.1}s`}} className="animate-fade-in-scale">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 text-base font-medium transition-all duration-300 nav-item-hover rounded-lg ${
                        pathname === item.href
                          ? 'text-white bg-teal-600/20 border border-teal-500/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10 hover:border hover:border-teal-500/20'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 nav-item-hover flex items-center justify-between rounded-lg ${
                          expandedDropdown === item.name
                            ? 'text-white bg-teal-600/20 border border-teal-500/30'
                            : 'text-white/80 hover:text-white hover:bg-white/10 hover:border hover:border-teal-500/20'
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
                        <div className="pl-4 space-y-1 animate-slide-up">
                          {item.dropdown.map((dropdownItem, dropdownIndex) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className={`block px-3 py-2 text-sm transition-all duration-300 dropdown-hover rounded-lg ${
                                pathname === dropdownItem.href
                                  ? 'text-white bg-teal-600 border border-teal-500'
                                  : 'text-white/70 hover:text-white hover:bg-teal-50/10 hover:border hover:border-teal-500/20'
                              }`}
                              style={{animationDelay: `${dropdownIndex * 0.1}s`}}
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
