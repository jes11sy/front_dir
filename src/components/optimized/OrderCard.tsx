/**
 * Оптимизированный компонент карточки заказа с React.memo
 */

'use client'

import React from 'react'
import { Order } from '@/lib/api'
import { sanitizeString, sanitizePhone } from '@/lib/sanitize'

interface OrderCardProps {
  order: Order
  onClick?: (order: Order) => void
}

const OrderCard = React.memo<OrderCardProps>(({ order, onClick }) => {
  const handleClick = React.useCallback(() => {
    onClick?.(order)
  }, [order, onClick])

  return (
    <div 
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-medium">
          {sanitizeString(order.clientName)}
        </h3>
        <span className={`px-2 py-1 rounded text-xs ${
          order.statusOrder === 'completed' ? 'bg-green-500' :
          order.statusOrder === 'in-progress' ? 'bg-yellow-500' :
          'bg-gray-500'
        }`}>
          {sanitizeString(order.statusOrder)}
        </span>
      </div>
      
      <div className="text-gray-400 text-sm space-y-1">
        <p>Телефон: {sanitizePhone(order.phone)}</p>
        <p>Город: {sanitizeString(order.city)}</p>
        {order.address && <p>Адрес: {sanitizeString(order.address)}</p>}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.statusOrder === nextProps.order.statusOrder &&
         prevProps.onClick === nextProps.onClick
})

OrderCard.displayName = 'OrderCard'

export default OrderCard

