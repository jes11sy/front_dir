/**
 * Компонент шапки заказа с номером и статусом
 */

import React from 'react';
import CustomSelect from '@/components/optimized/CustomSelect';

interface OrderHeaderProps {
  orderId: string;
  orderStatus: string;
  statuses: string[];
  onStatusChange: (status: string) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  openSelect: string | null;
  setOpenSelect: (id: string | null) => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderId,
  orderStatus,
  statuses,
  onStatusChange,
  onSave,
  saving,
  disabled,
  openSelect,
  setOpenSelect,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Заказ №{orderId}</h1>
          <div className="w-64">
            <CustomSelect
              value={orderStatus}
              onChange={onStatusChange}
              options={statuses.map(status => ({ value: status, label: status }))}
              placeholder="Выберите статус"
              compact={true}
              disabled={disabled}
              selectId="orderStatus"
              openSelect={openSelect}
              setOpenSelect={setOpenSelect}
            />
          </div>
        </div>
        <button 
          onClick={onSave}
          disabled={saving || disabled}
          className="px-6 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{backgroundColor: '#2a6b68'}}
          onMouseEnter={(e) => !saving && !disabled && ((e.target as HTMLElement).style.backgroundColor = '#1a5a57')}
          onMouseLeave={(e) => !saving && !disabled && ((e.target as HTMLElement).style.backgroundColor = '#2a6b68')}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  );
};

