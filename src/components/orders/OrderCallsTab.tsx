"use client"

/**
 * Компонент таба "Запись/История"
 * Показывает записи звонков, историю действий и историю заказов
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Call, apiClient, OrderHistoryItem } from '@/lib/api';
import { logger } from '@/lib/logger';
import { useDesignStore } from '@/store/design.store';
import { RefreshCw } from 'lucide-react';

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
  
  // История изменений заказа (из API)
  const [changeHistory, setChangeHistory] = useState<OrderHistoryItem[]>([]);
  const [changeHistoryLoading, setChangeHistoryLoading] = useState(false);
  const [changeHistoryError, setChangeHistoryError] = useState<string | null>(null);
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark';

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

  // Загружаем историю изменений заказа
  const loadChangeHistory = async () => {
    if (!order?.id) return;
    
    setChangeHistoryLoading(true);
    setChangeHistoryError(null);
    
    try {
      const result = await apiClient.getOrderHistory(order.id);
      setChangeHistory(result);
    } catch (error) {
      logger.error('Error loading change history:', error);
      setChangeHistoryError(error instanceof Error ? error.message : 'Ошибка загрузки истории изменений');
    } finally {
      setChangeHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadChangeHistory();
  }, [order?.id]);

  // Форматирование событий
  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'order.create': 'Создание заказа',
      'order.update': 'Изменение заказа',
      'order.close': 'Закрытие заказа',
      'order.status.change': 'Смена статуса',
    };
    return labels[eventType] || eventType;
  };

  // Форматирование изменений
  const formatChanges = (metadata: OrderHistoryItem['metadata']) => {
    if (!metadata) return null;

    const changes: React.ReactNode[] = [];

    // Изменение статуса
    if (metadata.oldStatus && metadata.newStatus) {
      changes.push(
        <span key="status" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          Статус: <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{metadata.oldStatus}</span>
          {' → '}
          <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{metadata.newStatus}</span>
        </span>
      );
    }

    // Закрытие заказа
    if (metadata.result) {
      changes.push(
        <span key="result" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          Итог: <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>{metadata.result} ₽</span>
        </span>
      );
    }

    // Другие изменения
    if (metadata.changes) {
      const fieldLabels: Record<string, string> = {
        statusOrder: 'Статус',
        masterId: 'Мастер',
        address: 'Адрес',
        phone: 'Телефон',
        clientName: 'Клиент',
        dateMeeting: 'Дата встречи',
        problem: 'Проблема',
        result: 'Итог',
        expenditure: 'Расход',
        clean: 'Чистыми',
        masterChange: 'Сдача мастера',
        comment: 'Комментарий',
      };

      Object.entries(metadata.changes).forEach(([field, change]) => {
        if (change && typeof change === 'object' && 'old' in change && 'new' in change) {
          const label = fieldLabels[field] || field;
          let oldVal = change.old ?? '—';
          let newVal = change.new ?? '—';
          
          // Форматируем даты
          if (field === 'dateMeeting') {
            if (oldVal !== '—') oldVal = new Date(oldVal as string).toLocaleString('ru-RU');
            if (newVal !== '—') newVal = new Date(newVal as string).toLocaleString('ru-RU');
          }

          changes.push(
            <span key={field} className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {label}: <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{String(oldVal)}</span>
              {' → '}
              <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{String(newVal)}</span>
            </span>
          );
        }
      });
    }

    return changes.length > 0 ? changes : null;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
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
      {/* Записи звонков */}
      <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Записи звонков</h3>
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
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Записи звонков недоступны</span>
            </div>
          ) : Array.isArray(calls) && calls.length > 0 ? (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className={`p-3 rounded-lg border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Звонок #{call.id}</span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Записи не найдены</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Кнопка чата Авито */}
      {order?.avitoChatId && (
        <div className={`rounded-xl shadow-sm p-4 ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
          <button 
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={() => router.push(`/orders/${order.id}/avito`)}
          >
            Открыть чат Авито
          </button>
        </div>
      )}

      {/* История заказов клиента */}
      <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>История заказов</h3>
          {order?.phone && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.phone}</span>
          )}
        </div>
        
        <div className="p-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : historyError ? (
            <div className="py-4 text-center">
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{historyError}</span>
            </div>
          ) : orderHistory.length > 0 ? (
            <div className="space-y-3">
              {orderHistory.map((historyOrder) => (
                <div 
                  key={historyOrder.id} 
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-[#3a4451] border-gray-600 hover:border-teal-600 hover:bg-[#3a4451]/80'
                      : 'bg-gray-50 border-gray-100 hover:border-teal-200 hover:bg-teal-50/30'
                  }`}
                  onClick={() => router.push(`/orders/${historyOrder.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{historyOrder.id}</span>
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
                          <span className={`text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {historyOrder.result.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>
                      
                      <div className={`mt-1.5 text-xs space-y-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="flex flex-wrap gap-x-2">
                          <span>{historyOrder.city}</span>
                          {historyOrder.typeEquipment && (
                            <span>• {historyOrder.typeEquipment}</span>
                          )}
                        </div>
                        {historyOrder.problem && (
                          <p className={`line-clamp-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{historyOrder.problem}</p>
                        )}
                        {historyOrder.master && (
                          <p className={isDark ? 'text-teal-400' : 'text-teal-600'}>Мастер: {historyOrder.master.name}</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatShortDate(historyOrder.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет других заказов</span>
            </div>
          )}
        </div>
      </div>

      {/* История изменений заказа */}
      <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>История изменений</h3>
          <button
            onClick={loadChangeHistory}
            disabled={changeHistoryLoading}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-teal-400 hover:bg-[#3a4451]' 
                : 'text-gray-400 hover:text-teal-600 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${changeHistoryLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="p-4">
          {changeHistoryLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : changeHistoryError ? (
            <div className="py-4 text-center">
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{changeHistoryError}</span>
            </div>
          ) : changeHistory.length > 0 ? (
            <div className="space-y-3">
              {changeHistory.map((item) => {
                const changes = formatChanges(item.metadata);
                
                return (
                  <div 
                    key={item.id}
                    className={`p-3 rounded-lg border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                          {getEventLabel(item.eventType)}
                        </div>
                        {changes && (
                          <div className="mt-1 space-y-0.5 text-sm">
                            {changes.map((change, idx) => (
                              <div key={idx}>{change}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDateTime(item.timestamp)}
                        </div>
                        {(item.userName || item.login) && (
                          <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.userName || item.login}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>История изменений пуста</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

