/**
 * Компонент таба "Мастер" - управление результатами заказа
 */

import React from 'react';
import CustomSelect from '@/components/optimized/CustomSelect';
import { Master } from '@/lib/api';
import { useDesignStore } from '@/store/design.store';

interface OrderMasterTabProps {
  orderStatus: string;
  selectedMaster: string;
  setSelectedMaster: (value: string) => void;
  masters: Master[];
  isPartner: boolean;
  setIsPartner: (value: boolean) => void;
  partnerPercent: string;
  setPartnerPercent: (value: string) => void;
  result: string;
  setResult: (value: string) => void;
  expenditure: string;
  setExpenditure: (value: string) => void;
  clean: string;
  setClean: (value: string) => void;
  masterChange: string;
  setMasterChange: (value: string) => void;
  comment: string;
  setComment: (value: string) => void;
  prepayment: string;
  setPrepayment: (value: string) => void;
  dateClosmod: string;
  setDateClosmod: (value: string) => void;
  isFieldsDisabled: () => boolean;
  shouldHideFinancialFields: () => boolean;
  openSelect: string | null;
  setOpenSelect: (id: string | null) => void;
}

export const OrderMasterTab: React.FC<OrderMasterTabProps> = ({
  orderStatus,
  selectedMaster,
  setSelectedMaster,
  masters,
  result,
  setResult,
  expenditure,
  setExpenditure,
  clean,
  setClean,
  masterChange,
  setMasterChange,
  comment,
  setComment,
  prepayment,
  setPrepayment,
  dateClosmod,
  setDateClosmod,
  isFieldsDisabled,
  shouldHideFinancialFields,
  openSelect,
  setOpenSelect,
}) => {
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  return (
    <div className="space-y-4">
      {/* Блок: Мастер */}
      <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
        <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</h3>
        </div>
        <div className="p-4 relative">
          <CustomSelect
            value={selectedMaster}
            onChange={setSelectedMaster}
            options={[
              { value: '', label: 'Выберите мастера' },
              ...masters.map(master => ({ value: master.id.toString(), label: master.name }))
            ]}
            placeholder="Выберите мастера"
            disabled={isFieldsDisabled()}
            selectId="master"
            openSelect={openSelect}
            setOpenSelect={setOpenSelect}
          />
        </div>
      </div>

      {orderStatus === 'Модерн' ? (
        // Поля для статуса "Модерн"
        <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Модерн</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сумма предоплаты</label>
                <input 
                  type="number" 
                  value={prepayment}
                  onChange={(e) => setPrepayment(e.target.value)}
                  disabled={isFieldsDisabled()}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                  placeholder="Введите сумму"
                />
              </div>
              
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата закрытия</label>
                <input 
                  type="date" 
                  value={dateClosmod}
                  onChange={(e) => setDateClosmod(e.target.value)}
                  disabled={isFieldsDisabled()}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Комментарий</label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isFieldsDisabled()}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                  isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                } ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                rows={2}
                placeholder="Введите комментарий"
              />
            </div>
          </div>
        </div>
      ) : (
        // Поля для остальных статусов
        <>
          {/* Блок: Финансы */}
          {!shouldHideFinancialFields() && (
            <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Финансы</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Итог</label>
                    <input 
                      type="number" 
                      value={result}
                      onChange={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? undefined : (e) => setResult(e.target.value)}
                      disabled={isFieldsDisabled() || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        orderStatus === 'Отказ' || orderStatus === 'Незаказ' || isFieldsDisabled()
                          ? isDark 
                            ? 'bg-[#3a4451] text-gray-500 cursor-not-allowed border-gray-600' 
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                          : isDark
                            ? 'bg-[#3a4451] text-gray-100 border-gray-600'
                            : 'bg-white text-gray-800 border-gray-200'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Расход</label>
                    <input 
                      type="number" 
                      value={expenditure}
                      onChange={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? undefined : (e) => setExpenditure(e.target.value)}
                      disabled={isFieldsDisabled() || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        orderStatus === 'Отказ' || orderStatus === 'Незаказ' || isFieldsDisabled()
                          ? isDark 
                            ? 'bg-[#3a4451] text-gray-500 cursor-not-allowed border-gray-600' 
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                          : isDark
                            ? 'bg-[#3a4451] text-gray-100 border-gray-600'
                            : 'bg-white text-gray-800 border-gray-200'
                      }`}
                      placeholder="0"
                    />
                  </div>

                  {orderStatus === 'Готово' && (
                    <>
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Чистыми</label>
                        <input 
                          type="number" 
                          value={clean || ''}
                          readOnly
                          className={`w-full px-3 py-2 border rounded-lg text-sm cursor-not-allowed ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-400'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                          placeholder="Авто"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сдача мастера</label>
                        <input 
                          type="number" 
                          value={masterChange || ''}
                          readOnly
                          className={`w-full px-3 py-2 border rounded-lg text-sm cursor-not-allowed ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-400'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                          placeholder="Авто"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Блок: Комментарий */}
          {(orderStatus === 'Готово' || orderStatus === 'В работе') && (
            <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Комментарий</h3>
              </div>
              <div className="p-4">
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isFieldsDisabled()}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                  rows={2}
                  placeholder="Введите комментарий..."
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

