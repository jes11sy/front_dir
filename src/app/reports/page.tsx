'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Users } from 'lucide-react'

export default function ReportsPage() {
  const menuItems = [
    {
      title: 'Отчет по городу',
      description: 'Статистика и отчеты по городам',
      href: '/reports/city',
      icon: Building2,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      title: 'Отчет по мастерам',
      description: 'Статистика работы мастеров',
      href: '/reports/masters',
      icon: Users,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#daece2' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Заголовок */}
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Отчеты</h1>

          {/* Карточки меню */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${item.color} ${item.hoverColor} rounded-lg flex items-center justify-center mb-4 transition-colors`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-teal-600 transition-colors">
                  {item.title}
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  {item.description}
                </p>
                <div className="flex items-center text-teal-600 text-sm font-medium">
                  Перейти
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
