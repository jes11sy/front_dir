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
            <label className="block text-sm font-medium text-gray-300 mb-1">Тип заказа</label>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: '#10b981'}}>
              {order.typeOrder}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">РК</label>
            <p className="text-white">{order.rk}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Город</label>
            <p className="text-white">{order.city}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Имя мастера</label>
            <p className="text-white">{order.avitoName || '-'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Телефон</label>
            <p className="text-white">{order.phone}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Клиент</label>
            <p className="text-white">{order.clientName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Адрес</label>
            <p className="text-white">{order.address}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Дата встречи</label>
            <p className="text-white">{new Date(order.dateMeeting).toLocaleString('ru-RU')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Направление</label>
            <p className="text-white">{order.typeEquipment}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Проблема</label>
            <p className="text-white">{order.problem}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

