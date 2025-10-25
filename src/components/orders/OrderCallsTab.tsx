/**
 * Компонент таба "Запись/Чат авито"
 */

import React, { useState, useEffect } from 'react';
import { Order, Call } from '@/lib/api';

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
  const [recordingUrls, setRecordingUrls] = useState<{ [key: number]: string }>({});

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
                    {new Date(call.dateCreate).toLocaleString('ru-RU')}
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
      
      {/* Чат авито - только кнопка */}
      {order?.avitoChatId && (
        <div className="flex justify-center">
          <button 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
            onClick={() => {
              window.open(`https://www.avito.ru/messenger/chat/${order.avitoChatId}`, '_blank')
            }}
          >
            Открыть чат Авито
          </button>
        </div>
      )}
    </div>
  );
};

