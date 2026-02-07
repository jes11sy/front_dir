'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { name: 'Мастера', href: '/employees/masters' },
  { name: 'График работы', href: '/employees/schedule' },
]

export default function EmployeesPage() {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 py-6">
        {/* Табы */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Контент - подсказка выбрать раздел */}
        <div className="text-center py-16 text-gray-500">
          <p>Выберите раздел</p>
        </div>
      </div>
    </div>
  )
}
