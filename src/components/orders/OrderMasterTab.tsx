/**
 * Компонент таба "Мастер" - управление результатами заказа
 */

import React from 'react';
import CustomSelect from '@/components/optimized/CustomSelect';
import { Master } from '@/lib/api';

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
  masterChange: string;
  comment: string;
  setComment: (value: string) => void;
  prepayment: string;
  setPrepayment: (value: string) => void;
  dateClosmod: string;
  setDateClosmod: (value: string) => void;
  bsoFile: File | null;
  expenditureFile: File | null;
  bsoPreview: string | null;
  expenditurePreview: string | null;
  handleFile: (file: File, type: 'bso' | 'expenditure') => void;
  removeFile: (type: 'bso' | 'expenditure') => void;
  isFieldsDisabled: () => boolean;
  shouldHideFinancialFields: () => boolean;
  openSelect: string | null;
  setOpenSelect: (id: string | null) => void;
  setBsoDragOver: (value: boolean) => void;
  setExpenditureDragOver: (value: boolean) => void;
  bsoDragOver: boolean;
  expenditureDragOver: boolean;
}

export const OrderMasterTab: React.FC<OrderMasterTabProps> = ({
  orderStatus,
  selectedMaster,
  setSelectedMaster,
  masters,
  isPartner,
  setIsPartner,
  partnerPercent,
  setPartnerPercent,
  result,
  setResult,
  expenditure,
  setExpenditure,
  clean,
  masterChange,
  comment,
  setComment,
  prepayment,
  setPrepayment,
  dateClosmod,
  setDateClosmod,
  bsoFile,
  expenditureFile,
  bsoPreview,
  expenditurePreview,
  handleFile,
  removeFile,
  isFieldsDisabled,
  shouldHideFinancialFields,
  openSelect,
  setOpenSelect,
  setBsoDragOver,
  setExpenditureDragOver,
  bsoDragOver,
  expenditureDragOver,
}) => {
  return (
    <div className="space-y-6">
      {/* Назначить мастера */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Назначить мастера</label>
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

      {/* Чекбокс партнер с полем процента */}
      <div className="flex items-start gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPartner"
            checked={isPartner}
            onChange={(e) => setIsPartner(e.target.checked)}
            disabled={isFieldsDisabled()}
            className={`w-4 h-4 text-teal-600 bg-white border-gray-300 rounded focus:ring-teal-500 focus:ring-2 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          />
          <label 
            htmlFor="isPartner" 
            className={`ml-2 text-sm font-medium text-gray-700 ${isFieldsDisabled() ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Партнер
          </label>
        </div>
        
        {isPartner && (
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <input
                type="number"
                value={partnerPercent}
                onChange={(e) => setPartnerPercent(e.target.value)}
                disabled={isFieldsDisabled()}
                min="0"
                max="100"
                className={`w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="Введите %"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
          </div>
        )}
      </div>

      {orderStatus === 'Модерн' ? (
        // Поля для статуса "Модерн"
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма предоплаты</label>
            <input 
              type="number" 
              value={prepayment}
              onChange={(e) => setPrepayment(e.target.value)}
              disabled={isFieldsDisabled()}
              className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Введите сумму предоплаты"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата закрытия</label>
            <input 
              type="date" 
              value={dateClosmod}
              onChange={(e) => setDateClosmod(e.target.value)}
              disabled={isFieldsDisabled()}
              className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isFieldsDisabled()}
              className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
              rows={3}
              placeholder="Введите комментарий"
            />
          </div>
        </>
      ) : (
        // Поля для остальных статусов
        <>
          {/* Итог и Расход */}
          {!shouldHideFinancialFields() && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Итог</label>
                <input 
                  type="number" 
                  value={result}
                  onChange={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? undefined : (e) => setResult(e.target.value)}
                  disabled={isFieldsDisabled() || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    orderStatus === 'Отказ' || orderStatus === 'Незаказ'
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                      : isFieldsDisabled() 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                        : 'bg-white text-gray-800 border-gray-300'
                  }`}
                  placeholder={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? "Автоматически 0" : "Введите итоговую сумму"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Расход</label>
                <input 
                  type="number" 
                  value={expenditure}
                  onChange={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? undefined : (e) => setExpenditure(e.target.value)}
                  disabled={isFieldsDisabled() || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    orderStatus === 'Отказ' || orderStatus === 'Незаказ'
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                      : isFieldsDisabled() 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                        : 'bg-white text-gray-800 border-gray-300'
                  }`}
                  placeholder={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? "Автоматически 0" : "Введите сумму расхода"}
                />
              </div>
            </div>
          )}

          {/* Дополнительные поля для "Готово" */}
          {orderStatus === 'Готово' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Чистыми</label>
                  <input 
                    type="number" 
                    value={clean || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                    placeholder={clean ? '' : 'Автоматически рассчитывается'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сдача мастера</label>
                  <input 
                    type="number" 
                    value={masterChange || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                    placeholder={masterChange ? '' : 'Автоматически рассчитывается'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isFieldsDisabled()}
                  className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  rows={3}
                  placeholder="Введите комментарий"
                />
              </div>
            </>
          )}

          {/* Комментарий для "В работе" */}
          {orderStatus === 'В работе' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isFieldsDisabled()}
                className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isFieldsDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                rows={3}
                placeholder="Введите комментарий"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

