/**
 * Красивая анимация загрузки для страницы заказа
 */

import React from 'react'

export const OrderLoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      {/* Основной спиннер */}
      <div className="relative mb-6">
        {/* Внешнее кольцо */}
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin">
          <div className="w-full h-full border-4 border-transparent border-t-teal-600 rounded-full animate-spin"></div>
        </div>
        
        {/* Внутреннее кольцо */}
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-gray-100 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}>
          <div className="w-full h-full border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
        </div>
        
        {/* Центральная точка */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full animate-pulse"></div>
      </div>

      {/* Текст загрузки */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 animate-pulse">
          Загрузка заказа...
        </h3>
        <p className="text-gray-600 text-sm">
          Получаем данные о заказе
        </p>
      </div>

      {/* Прогресс-бар */}
      <div className="w-64 h-1 bg-gray-200 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full animate-pulse" style={{
          animation: 'loading-bar 2s ease-in-out infinite'
        }}></div>
      </div>

      {/* Дополнительные элементы */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )
}
