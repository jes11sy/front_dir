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

// Функция для безопасного форматирования только даты (без времени)
const formatShortDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
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
    <div className="space-y-4">
      {/* Записи звонков */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-700 font-medium text-sm">Записи звонков</h3>
          {calls.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{calls.length}</span>
          )}
        </div>
        
        <div className="p-4">
          {callsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : callsError ? (
            <div className="py-4 text-center">
              <span className="text-sm text-gray-400">Записи звонков недоступны</span>
            </div>
          ) : Array.isArray(calls) && calls.length > 0 ? (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">Звонок #{call.id}</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(call.createdAt || call.recordingProcessedAt)}
                    </span>
                  </div>
                  
                  {call.recordingPath && recordingUrls[call.id] && (
                    <audio 
                      controls 
                      className="w-full h-10"
                      style={{ borderRadius: '8px' }}
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
            <div className="py-6 text-center">
              <span className="text-sm text-gray-400">Записи не найдены</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Кнопка чата Авито */}
      {order?.avitoChatId && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <button 
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={() => router.push(`/orders/${order.id}/avito`)}
          >
            Открыть чат Авито
          </button>
        </div>
      )}

      {/* История заказов клиента */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-700 font-medium text-sm">История заказов</h3>
          {order?.phone && (
            <span className="text-xs text-gray-400">{order.phone}</span>
          )}
        </div>
        
        <div className="p-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : historyError ? (
            <div className="py-4 text-center">
              <span className="text-sm text-gray-400">{historyError}</span>
            </div>
          ) : orderHistory.length > 0 ? (
            <div className="space-y-3">
              {orderHistory.map((historyOrder) => (
                <div 
                  key={historyOrder.id} 
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/orders/${historyOrder.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">#{historyOrder.id}</span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                          historyOrder.statusOrder === 'Готово' ? 'bg-green-100 text-green-700' :
                          historyOrder.statusOrder === 'Отказ' ? 'bg-red-100 text-red-700' :
                          historyOrder.statusOrder === 'Незаказ' ? 'bg-gray-200 text-gray-600' :
                          historyOrder.statusOrder === 'В работе' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {historyOrder.statusOrder}
                        </span>
                        {historyOrder.result && historyOrder.result > 0 && (
                          <span className="text-xs font-medium text-green-600">
                            {historyOrder.result.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                        <div className="flex flex-wrap gap-x-2">
                          <span>{historyOrder.city}</span>
                          {historyOrder.typeEquipment && (
                            <span>• {historyOrder.typeEquipment}</span>
                          )}
                        </div>
                        {historyOrder.problem && (
                          <p className="line-clamp-1 text-gray-400">{historyOrder.problem}</p>
                        )}
                        {historyOrder.master && (
                          <p className="text-teal-600">Мастер: {historyOrder.master.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {formatShortDate(historyOrder.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <span className="text-sm text-gray-400">Нет других заказов</span>
            </div>
          )}
        </div>
      </div>

      {/* История изменений заказа */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-700 font-medium text-sm">История изменений</h3>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Текущий статус */}
          {order?.statusOrder && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">Текущий статус</div>
                  <div className="mt-1 text-sm">
                    <span className="text-gray-500">Статус: </span>
                    <span className={`font-medium ${
                      order.statusOrder === 'Готово' ? 'text-green-600' :
                      order.statusOrder === 'Отказ' || order.statusOrder === 'Незаказ' ? 'text-red-600' :
                      order.statusOrder === 'В работе' || order.statusOrder === 'В пути' ? 'text-blue-600' :
                      'text-gray-800'
                    }`}>{order.statusOrder}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(order.updatedAt)}
                </div>
              </div>
            </div>
          )}
          
          {/* Назначен мастер */}
          {order?.masterId && order?.masterName && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">Назначен мастер</div>
                  <div className="mt-1 text-sm">
                    <span className="text-gray-500">Мастер: </span>
                    <span className="font-medium text-purple-600">{order.masterName}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Финансы заполнены */}
          {order?.result && order.result > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">Финансы</div>
                  <div className="mt-1 text-sm space-y-0.5">
                    <div>
                      <span className="text-gray-500">Итог: </span>
                      <span className="font-medium text-green-600">{order.result.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {order.expenditure && order.expenditure > 0 && (
                      <div>
                        <span className="text-gray-500">Расход: </span>
                        <span className="font-medium text-red-600">{order.expenditure.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    {order.clean && (
                      <div>
                        <span className="text-gray-500">Чистыми: </span>
                        <span className="font-medium text-teal-600">{order.clean.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                  </div>
                </div>
                {order.dateClosmod && (
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatShortDate(order.dateClosmod)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Создание заказа */}
          {order?.createdAt && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">Создание заказа</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Заказ #{order.id} создан
                  </div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

