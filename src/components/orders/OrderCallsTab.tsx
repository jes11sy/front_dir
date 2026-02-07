"use client"

/**
 * Компонент таба "Запись/История"
 * Показывает записи звонков, историю действий и историю заказов
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Call, apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';

interface OrderHistory {
  id: number;
  clientName: string;
  city: string;
  statusOrder: string;
  dateMeeting: string;
  typeEquipment: string;
  typeOrder: string;
  problem: string;
  createdAt: string;
  rk: string;
  avitoName: string;
  address: string;
  result: number | null;
  master: { id: number; name: string } | null;
}

// История действий заказа (локальное хранение на основе данных заказа)
interface OrderAction {
  id: number;
  action: string;
  details: string;
  timestamp: string;
}

// Функция для безопасного форматирования даты
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

interface OrderCallsTabProps {
  order: Order;
  calls: Call[];
  callsLoading: boolean;
  callsError?: string | null;
}

export const OrderCallsTab: React.FC<OrderCallsTabProps> = ({
  order,
  calls,
  callsLoading,
  callsError,
}) => {
  const router = useRouter();
  const [recordingUrls, setRecordingUrls] = useState<{ [key: number]: string }>({});
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Формируем историю действий на основе данных заказа
  const getOrderActions = (): OrderAction[] => {
    const actions: OrderAction[] = [];
    let actionId = 1;
    
    // Создание заказа
    if (order?.createdAt) {
      actions.push({
        id: actionId++,
        action: 'Создан заказ',
        details: `Заказ #${order.id} создан`,
        timestamp: order.createdAt
      });
    }
    
    // Назначение мастера
    if (order?.masterId && order?.masterName) {
      actions.push({
        id: actionId++,
        action: 'Назначен мастер',
        details: `Мастер: ${order.masterName}`,
        timestamp: order.updatedAt || order.createdAt || ''
      });
    }
    
    // Статус заказа
    if (order?.statusOrder) {
      const statusMessages: Record<string, string> = {
        'Ожидает': 'Заказ ожидает обработки',
        'Принял': 'Мастер принял заказ',
        'В пути': 'Мастер выехал к клиенту',
        'В работе': 'Мастер приступил к работе',
        'Модерн': 'Заказ на модерации',
        'Готово': 'Заказ успешно выполнен',
        'Отказ': 'Клиент отказался от заказа',
        'Незаказ': 'Заказ не состоялся'
      };
      
      actions.push({
        id: actionId++,
        action: `Статус: ${order.statusOrder}`,
        details: statusMessages[order.statusOrder] || '',
        timestamp: order.updatedAt || ''
      });
    }
    
    // Финансовые данные (если есть итог)
    if (order?.result && order.result > 0) {
      actions.push({
        id: actionId++,
        action: 'Финансы заполнены',
        details: `Итог: ${order.result.toLocaleString('ru-RU')} ₽${order.expenditure ? `, Расход: ${order.expenditure.toLocaleString('ru-RU')} ₽` : ''}`,
        timestamp: order.dateClosmod || order.updatedAt || ''
      });
    }
    
    // Дата закрытия/модерации
    if (order?.dateClosmod) {
      actions.push({
        id: actionId++,
        action: 'Дата закрытия установлена',
        details: formatDate(order.dateClosmod),
        timestamp: order.dateClosmod
      });
    }
    
    // Сортируем по дате (новые сверху)
    return actions.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  // Получаем прямые S3 URL для записей
  useEffect(() => {
    const loadRecordingUrls = () => {
      const urls: { [key: number]: string } = {};
      
      for (const call of calls) {
        if (call.recordingPath) {
          // Используем прямой S3 URL без подписи
          const s3Url = `https://s3.twcstorage.ru/f7eead03-crmfiles/${call.recordingPath}`;
          urls[call.id] = s3Url;
        }
      }
      
      setRecordingUrls(urls);
    };

    if (calls.length > 0) {
      loadRecordingUrls();
    }
  }, [calls]);

  // Загружаем историю заказов по номеру телефона
  useEffect(() => {
    const loadOrderHistory = async () => {
      if (!order?.phone) return;
      
      setHistoryLoading(true);
      setHistoryError(null);
      
      try {
        const result = await apiClient.getOrdersByPhone(order.phone);
        if (result.success) {
          // Фильтруем текущий заказ из истории
          const filteredHistory = result.data.filter(h => h.id !== order.id);
          setOrderHistory(filteredHistory);
        }
      } catch (error) {
        logger.error('Error loading order history:', error);
        setHistoryError(error instanceof Error ? error.message : 'Ошибка загрузки истории');
      } finally {
        setHistoryLoading(false);
      }
    };

    loadOrderHistory();
  }, [order?.phone, order?.id]);
  return (
    <div className="space-y-6">
      {/* Записи звонков */}
      {callsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Загрузка записей звонков...</p>
        </div>
      ) : callsError ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-700 text-sm">
            Записи звонков недоступны. API для звонков не реализован.
          </p>
        </div>
      ) : Array.isArray(calls) && calls.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Записи звонков</h3>
          {calls.map((call) => (
            <div key={call.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">
                    {formatDate(call.createdAt || call.recordingProcessedAt)}
                  </span>
                </div>
              </div>
              
              {call.recordingPath && recordingUrls[call.id] && (
                <audio 
                  controls 
                  className="w-full h-10 bg-gray-50 rounded"
                >
                  <source 
                    src={recordingUrls[call.id]}
                    type="audio/mpeg" 
                  />
                </audio>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Записи звонков отсутствуют</p>
        </div>
      )}
      
      {/* Кнопка чата Авито */}
      {order?.avitoChatId && (
        <div className="flex justify-center">
          <button 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
            onClick={() => router.push(`/orders/${order.id}/avito`)}
          >
            Открыть чат Авито
          </button>
        </div>
      )}

      {/* История действий */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">История действий</h3>
        
        {(() => {
          const actions = getOrderActions();
          
          if (actions.length === 0) {
            return (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Нет записей о действиях</p>
              </div>
            );
          }
          
          return (
            <div className="relative">
              {/* Вертикальная линия */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-4">
                {actions.map((action) => (
                  <div key={action.id} className="relative flex gap-4 pl-10">
                    {/* Точка на линии */}
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                      action.action.includes('Готово') ? 'bg-green-500' :
                      action.action.includes('Отказ') || action.action.includes('Незаказ') ? 'bg-red-500' :
                      action.action.includes('Создан') ? 'bg-blue-500' :
                      action.action.includes('мастер') ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}></div>
                    
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-800 text-sm">{action.action}</span>
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {formatDate(action.timestamp)}
                        </span>
                      </div>
                      {action.details && (
                        <p className="text-gray-600 text-sm mt-1">{action.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* История заказов по номеру телефона */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">История заказов</h3>
        
        {historyLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Загрузка истории заказов...</p>
          </div>
        ) : historyError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-700 text-sm">{historyError}</p>
          </div>
        ) : orderHistory.length > 0 ? (
          <div className="space-y-3">
            {orderHistory.map((historyOrder) => (
              <div 
                key={historyOrder.id} 
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/orders/${historyOrder.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">#{historyOrder.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      historyOrder.statusOrder === 'Готово' ? 'bg-green-100 text-green-700' :
                      historyOrder.statusOrder === 'Отказ' ? 'bg-red-100 text-red-700' :
                      historyOrder.statusOrder === 'Незаказ' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {historyOrder.statusOrder}
                    </span>
                    {historyOrder.result && historyOrder.result > 0 && (
                      <span className="text-green-600 font-medium text-sm">
                        {historyOrder.result.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatDate(historyOrder.createdAt)}
                  </span>
                </div>
                
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-500">{historyOrder.city}</span>
                    {historyOrder.typeEquipment && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{historyOrder.typeEquipment}</span>
                      </>
                    )}
                    {historyOrder.rk && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-purple-600">{historyOrder.rk}</span>
                      </>
                    )}
                  </div>
                  {historyOrder.problem && (
                    <p className="text-gray-500 line-clamp-2">{historyOrder.problem}</p>
                  )}
                  {historyOrder.master && (
                    <p className="text-teal-600 text-xs">
                      Мастер: {historyOrder.master.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">
              Нет других заказов с этим номером телефона
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

