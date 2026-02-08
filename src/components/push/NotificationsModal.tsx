'use client';

import { useState } from 'react';
import { Bell, BellOff, BellRing, Settings, X } from 'lucide-react';
import { useDesignStore } from '@/store/design.store';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Модальное окно управления push-уведомлениями
 * Пока без функционала - только UI
 */
export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const { theme } = useDesignStore();
  
  // Заглушки для состояний - пока без функционала
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState({
    newOrders: true,
    orderUpdates: true,
    payments: true,
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9999] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className={`
            w-full max-w-md pointer-events-auto
            rounded-xl shadow-2xl border
            animate-in zoom-in-95 duration-200
            ${theme === 'dark' 
              ? 'bg-[#1e2530] border-gray-700' 
              : 'bg-white border-gray-200'
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`
                p-2.5 rounded-xl
                ${isSubscribed 
                  ? 'bg-[#0d5c4b]/10' 
                  : theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                }
              `}>
                {isSubscribed ? (
                  <BellRing size={24} className="text-[#0d5c4b]" />
                ) : (
                  <BellOff size={24} className="text-gray-400" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Push-уведомления
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isSubscribed ? 'Включены' : 'Выключены'}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${theme === 'dark' 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Main toggle button */}
            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`
                w-full px-4 py-3 rounded-lg font-medium transition-colors mb-4
                ${isSubscribed 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                  : 'bg-[#0d5c4b] text-white hover:bg-[#0a4d3f]'
                }
              `}
            >
              {isSubscribed ? 'Отключить уведомления' : 'Включить уведомления'}
            </button>

            {/* Settings (show only when subscribed) */}
            {isSubscribed && (
              <div className={`
                border-t pt-4 mt-4
                ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
              `}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings size={16} className="text-gray-500" />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Типы уведомлений
                  </span>
                </div>

                <div className="space-y-3">
                  {/* New orders */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Новые заказы
                    </span>
                    <button
                      onClick={() => setSettings(s => ({ ...s, newOrders: !s.newOrders }))}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative
                        ${settings.newOrders 
                          ? 'bg-[#0d5c4b]' 
                          : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                        }
                      `}
                    >
                      <span className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${settings.newOrders ? 'left-6' : 'left-1'}
                      `} />
                    </button>
                  </label>

                  {/* Order updates */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Изменения статуса заказов
                    </span>
                    <button
                      onClick={() => setSettings(s => ({ ...s, orderUpdates: !s.orderUpdates }))}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative
                        ${settings.orderUpdates 
                          ? 'bg-[#0d5c4b]' 
                          : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                        }
                      `}
                    >
                      <span className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${settings.orderUpdates ? 'left-6' : 'left-1'}
                      `} />
                    </button>
                  </label>

                  {/* Payments */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Платежи
                    </span>
                    <button
                      onClick={() => setSettings(s => ({ ...s, payments: !s.payments }))}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative
                        ${settings.payments 
                          ? 'bg-[#0d5c4b]' 
                          : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                        }
                      `}
                    >
                      <span className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${settings.payments ? 'left-6' : 'left-1'}
                      `} />
                    </button>
                  </label>
                </div>

                {/* Test notification button */}
                <button
                  onClick={() => {
                    // Placeholder - пока без функционала
                    console.log('Тестовое уведомление');
                  }}
                  className={`
                    mt-4 w-full py-2.5 text-sm font-medium rounded-lg transition-colors
                    text-[#0d5c4b] hover:bg-[#0d5c4b]/10
                  `}
                >
                  Отправить тестовое уведомление
                </button>
              </div>
            )}

            {/* Info message when not subscribed */}
            {!isSubscribed && (
              <div className={`
                p-3 rounded-lg text-sm
                ${theme === 'dark' 
                  ? 'bg-gray-700/50 text-gray-300' 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                <p>
                  Получайте уведомления о новых заказах, изменениях статуса и платежах, 
                  даже когда вкладка браузера закрыта.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NotificationsModal;
