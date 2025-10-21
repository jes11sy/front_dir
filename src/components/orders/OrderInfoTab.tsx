/**
 * Компонент таба "Основная информация" заказа
 */

import React from 'react';
import { Order } from '@/lib/api';

interface OrderInfoTabProps {
  order: Order;
}

export const OrderInfoTab: React.FC<OrderInfoTabProps> = ({ order }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Тип заказа</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.typeOrder}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">РК</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.pk}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Город</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.city}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Имя мастера</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.nameMaster}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Телефон</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.telephone}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Клиент</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.client}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Адрес</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.adres}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Дата встречи</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.dateMeet ? formatDate(order.dateMeet) : '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Направление</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.napravlenie}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Проблема</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.problema}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Марка</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.marka || '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Модель</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.model || '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Оператор</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.operator?.name || '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Дата создания</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.dateCreate ? formatDate(order.dateCreate) : '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Обновлен</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.updateDate ? formatDate(order.updateDate) : '-'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">ID клиента</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.clientId || '-'}
          </div>
        </div>

        {order.idAvito && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ID Авито</label>
            <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
              {order.idAvito}
            </div>
          </div>
        )}

        {order.source && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Источник</label>
            <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
              {order.source}
            </div>
          </div>
        )}
      </div>

      {/* Комментарии (если есть) */}
      {order.comment && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.comment}
          </div>
        </div>
      )}

      {/* Финансовая информация (если есть) */}
      {(order.result !== null && order.result !== undefined) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Итог</label>
            <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
              {order.result} ₽
            </div>
          </div>
          
          {order.expenditure !== null && order.expenditure !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Расход</label>
              <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
                {order.expenditure} ₽
              </div>
            </div>
          )}

          {order.clean !== null && order.clean !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Чистыми</label>
              <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
                {order.clean} ₽
              </div>
            </div>
          )}

          {order.masterChange !== null && order.masterChange !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Сдача мастера</label>
              <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
                {order.masterChange} ₽
              </div>
            </div>
          )}
        </div>
      )}

      {/* Информация о модерации */}
      {order.prepayment !== null && order.prepayment !== undefined && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Предоплата</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {order.prepayment} ₽
          </div>
        </div>
      )}

      {order.dateClosmod && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Дата закрытия модерации</label>
          <div className="px-3 py-2 rounded-lg text-white" style={{backgroundColor: '#1a3a3a'}}>
            {formatDate(order.dateClosmod)}
          </div>
        </div>
      )}
    </div>
  );
};

