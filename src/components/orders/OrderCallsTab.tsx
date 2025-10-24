/**
 * Компонент таба "Запись/Чат авито"
 */

import React from 'react';
import { Order, Call } from '@/lib/api';

interface OrderCallsTabProps {
  order: Order;
  calls: Call[];
  callsLoading: boolean;
}

export const OrderCallsTab: React.FC<OrderCallsTabProps> = ({
  order,
  calls,
  callsLoading,
}) => {
  return (
    <div className="space-y-6">
      {/* Записи звонков */}
      {callsLoading ? (
        <div className="text-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
        </div>
      ) : Array.isArray(calls) && calls.length > 0 ? (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="bg-gray-700 rounded p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                <span className="text-gray-300 text-sm">
                  Оператор: {call.operator?.name || 'Неизвестно'}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(call.dateCreate).toLocaleString('ru-RU')}
                </span>
              </div>
              
              {call.recordingPath && (
                <audio 
                  controls 
                  className="w-full h-10"
                  style={{backgroundColor: '#374151'}}
                >
                  <source 
                    src={call.recordingPath || ''}
                    type="audio/mpeg" 
                  />
                </audio>
              )}
            </div>
          ))}
        </div>
      ) : !order?.avitoChatId && (
        <p className="text-gray-400 text-sm text-center py-2">Нет записей</p>
      )}
      
      {/* Чат авито */}
      {order?.avitoChatId && (
        <div className="flex justify-center">
          <button 
            className="px-6 py-3 text-white rounded-lg transition-colors font-medium"
            style={{backgroundColor: '#2a6b68'}}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a5a57'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a6b68'}
          >
            Открыть чат авито
          </button>
        </div>
      )}
    </div>
  );
};

