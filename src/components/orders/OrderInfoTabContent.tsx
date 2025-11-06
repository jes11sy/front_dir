/**
 * Компонент таба "Информация по заказу"
 */

import React from 'react';
import { Order } from '@/lib/api';

interface OrderInfoTabContentProps {
  order: Order;
}

export const OrderInfoTabContent: React.FC<OrderInfoTabContentProps> = ({ order }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип заказа</label>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: '#10b981'}}>
              {order.typeOrder}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">РК</label>
            <p className="text-gray-800">{order.rk}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
            <p className="text-gray-800">{order.city}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя мастера</label>
            <p className="text-gray-800">{order.avitoName || '-'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <p className="text-gray-800">{order.phone}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Клиент</label>
            <p className="text-gray-800">{order.clientName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
            <p className="text-gray-800">{order.address}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата встречи</label>
            <p className="text-gray-800">{new Date(order.dateMeeting).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC'
            })}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Направление</label>
            <p className="text-gray-800">{order.typeEquipment}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Проблема</label>
            <p className="text-gray-800">{order.problem}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

