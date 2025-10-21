/**
 * Компонент таба "Мастер" с полями итога, расхода, документов
 */

import React, { useState, useEffect } from 'react';
import CustomSelect from '@/components/optimized/CustomSelect';
import { Order, Master, apiClient } from '@/lib/api';
import { uploadFile, getSignedUrl } from '@/lib/s3-utils';
import { toast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

interface OrderResultTabProps {
  order: Order;
  masters: Master[];
  onUpdate: (data: Partial<Order>) => void;
  disabled: boolean;
  openSelect: string | null;
  setOpenSelect: (id: string | null) => void;
}

export const OrderResultTab: React.FC<OrderResultTabProps> = ({
  order,
  masters,
  onUpdate,
  disabled,
  openSelect,
  setOpenSelect,
}) => {
  const [selectedMaster, setSelectedMaster] = useState(order.masterId?.toString() || '');
  const [result, setResult] = useState(order.result?.toString() || '');
  const [expenditure, setExpenditure] = useState(order.expenditure?.toString() || '');
  const [clean, setClean] = useState(order.clean?.toString() || '');
  const [masterChange, setMasterChange] = useState(order.masterChange?.toString() || '');
  const [comment, setComment] = useState(order.comment || '');
  const [prepayment, setPrepayment] = useState(order.prepayment?.toString() || '');
  const [dateClosmod, setDateClosmod] = useState(
    order.dateClosmod ? new Date(order.dateClosmod).toISOString().split('T')[0] : ''
  );
  const [bsoDocPath, setBsoDocPath] = useState<string | undefined>(order.bsoDoc);
  const [expenditureDocPath, setExpenditureDocPath] = useState<string | undefined>(order.expenditureDoc);
  const [uploadingBso, setUploadingBso] = useState(false);
  const [uploadingExpenditure, setUploadingExpenditure] = useState(false);

  const orderStatus = order.statusOrder || '';

  // Автоматический расчет при статусе "Готово"
  useEffect(() => {
    if (orderStatus === 'Готово' && result) {
      const resultAmount = Number(result);
      const expenditureAmount = expenditure ? Number(expenditure) : 0;
      
      if (resultAmount > 0) {
        const cleanAmount = resultAmount - expenditureAmount;
        const masterChangeAmount = cleanAmount / 2;
        
        setClean(cleanAmount.toString());
        setMasterChange(masterChangeAmount.toString());
      }
    }
  }, [result, expenditure, orderStatus]);

  // Автоматически 0 для "Отказ" и "Незаказ"
  useEffect(() => {
    if (orderStatus === 'Отказ' || orderStatus === 'Незаказ') {
      setResult('0');
      setExpenditure('0');
    }
  }, [orderStatus]);

  const shouldHideFinancialFields = () => {
    return ['Ожидает', 'Принял', 'В пути'].includes(orderStatus);
  };

  const handleBsoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBso(true);
      const path = await uploadFile(file, 'orders');
      setBsoDocPath(path);
      onUpdate({ bsoDoc: path });
      toast.success('БСО загружен');
    } catch (error) {
      logger.error('Failed to upload BSO', error);
      toast.error('Ошибка загрузки БСО');
    } finally {
      setUploadingBso(false);
    }
  };

  const handleExpenditureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingExpenditure(true);
      const path = await uploadFile(file, 'orders');
      setExpenditureDocPath(path);
      onUpdate({ expenditureDoc: path });
      toast.success('Накладная загружена');
    } catch (error) {
      logger.error('Failed to upload expenditure doc', error);
      toast.error('Ошибка загрузки накладной');
    } finally {
      setUploadingExpenditure(false);
    }
  };

  const handleViewDocument = async (docPath: string | undefined, docName: string) => {
    if (!docPath) return;

    try {
      const signedUrl = await getSignedUrl(docPath);
      window.open(signedUrl, '_blank');
    } catch (error) {
      logger.error(`Failed to view ${docName}`, error);
      toast.error(`Ошибка открытия ${docName}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Назначить мастера */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Назначить мастера</label>
        <CustomSelect
          value={selectedMaster}
          onChange={(value) => {
            setSelectedMaster(value);
            onUpdate({ masterId: value ? Number(value) : undefined });
          }}
          options={[
            { value: '', label: 'Выберите мастера' },
            ...masters.map(master => ({ value: master.id, label: master.name }))
          ]}
          placeholder="Выберите мастера"
          disabled={disabled}
          selectId="master"
          openSelect={openSelect}
          setOpenSelect={setOpenSelect}
        />
      </div>

      {orderStatus === 'Модерн' ? (
        // Поля для статуса "Модерн"
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Сумма предоплаты</label>
            <input
              type="number"
              value={prepayment}
              onChange={(e) => {
                setPrepayment(e.target.value);
                onUpdate({ prepayment: Number(e.target.value) });
              }}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
              placeholder="Введите сумму предоплаты"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Дата закрытия</label>
            <input
              type="date"
              value={dateClosmod}
              onChange={(e) => {
                setDateClosmod(e.target.value);
                onUpdate({ dateClosmod: new Date(e.target.value).toISOString() });
              }}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                onUpdate({ comment: e.target.value });
              }}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
              rows={3}
              placeholder="Введите комментарий"
            />
          </div>
        </>
      ) : (
        <>
          {/* Итог и Расход */}
          {!shouldHideFinancialFields() && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Итог</label>
                <input
                  type="number"
                  value={result}
                  onChange={(e) => {
                    setResult(e.target.value);
                    onUpdate({ result: Number(e.target.value) });
                  }}
                  disabled={disabled || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
                  placeholder={orderStatus === 'Отказ' || orderStatus === 'Незаказ' ? "Автоматически 0" : "Введите итоговую сумму"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Расход</label>
                <input
                  type="number"
                  value={expenditure}
                  onChange={(e) => {
                    setExpenditure(e.target.value);
                    onUpdate({ expenditure: Number(e.target.value) });
                  }}
                  disabled={disabled || orderStatus === 'Отказ' || orderStatus === 'Незаказ'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Чистыми</label>
                  <input
                    type="number"
                    value={clean}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 cursor-not-allowed"
                    placeholder="Автоматически рассчитывается"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Сдача мастера</label>
                  <input
                    type="number"
                    value={masterChange}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 cursor-not-allowed"
                    placeholder="Автоматически рассчитывается"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    onUpdate({ comment: e.target.value });
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
                  rows={3}
                  placeholder="Введите комментарий"
                />
              </div>

              {/* Загрузка документов */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">БСО</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      onChange={handleBsoUpload}
                      disabled={disabled || uploadingBso}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                      accept="image/*,.pdf"
                    />
                    {bsoDocPath && (
                      <button
                        onClick={() => handleViewDocument(bsoDocPath, 'БСО')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                      >
                        Просмотр
                      </button>
                    )}
                  </div>
                  {uploadingBso && <p className="text-xs text-gray-400 mt-1">Загрузка...</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Накладная расхода</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      onChange={handleExpenditureUpload}
                      disabled={disabled || uploadingExpenditure}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                      accept="image/*,.pdf"
                    />
                    {expenditureDocPath && (
                      <button
                        onClick={() => handleViewDocument(expenditureDocPath, 'Накладная')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                      >
                        Просмотр
                      </button>
                    )}
                  </div>
                  {uploadingExpenditure && <p className="text-xs text-gray-400 mt-1">Загрузка...</p>}
                </div>
              </div>
            </>
          )}

          {/* Комментарий для "В работе" */}
          {orderStatus === 'В работе' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  onUpdate({ comment: e.target.value });
                }}
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none"
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

