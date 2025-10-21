/**
 * Переиспользуемый компонент модального окна для добавления кассовой операции
 */

import React from 'react';
import { useForm } from '@/hooks/useForm';
import CustomSelect from '@/components/optimized/CustomSelect';
import { Button } from '@/components/ui/button';

interface CashTransactionFormData {
  city: string;
  amount: string;
  purpose: string;
  comment: string;
  receipt: File | null;
}

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CashTransactionFormData) => Promise<void>;
  title: string;
  cities: Array<{ value: string; label: string }>;
  purposes: Array<{ value: string; label: string }>;
  openSelect: string | null;
  setOpenSelect: (id: string | null) => void;
}

export const CashTransactionModal: React.FC<CashTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  cities,
  purposes,
  openSelect,
  setOpenSelect,
}) => {
  const form = useForm<CashTransactionFormData>({
    initialValues: {
      city: '',
      amount: '',
      purpose: '',
      comment: '',
      receipt: null,
    },
    onSubmit: async (values) => {
      await onSubmit(values);
      onClose();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    form.setFieldValue('receipt', file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="rounded-lg shadow-xl max-w-md w-full mx-4" style={{backgroundColor: '#15282f'}}>
        <div className="p-6 border-b" style={{borderColor: '#2a6b68'}}>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>

        <form onSubmit={form.handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Город */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Город</label>
              <CustomSelect
                value={form.values.city}
                onChange={form.handleChange('city')}
                options={cities}
                placeholder="Выберите город"
                selectId="city"
                openSelect={openSelect}
                setOpenSelect={setOpenSelect}
              />
            </div>

            {/* Сумма */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Сумма</label>
              <input
                type="number"
                value={form.values.amount}
                onChange={form.handleInputChange('amount')}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-teal-500 focus:outline-none"
                placeholder="Введите сумму"
                required
              />
            </div>

            {/* Назначение платежа */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Назначение платежа</label>
              <CustomSelect
                value={form.values.purpose}
                onChange={form.handleChange('purpose')}
                options={purposes}
                placeholder="Выберите назначение"
                selectId="purpose"
                openSelect={openSelect}
                setOpenSelect={setOpenSelect}
              />
            </div>

            {/* Комментарий */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
              <textarea
                value={form.values.comment}
                onChange={form.handleInputChange('comment')}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-teal-500 focus:outline-none"
                rows={3}
                placeholder="Введите комментарий"
              />
            </div>

            {/* Чек */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Чек</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-teal-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
              />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              disabled={form.isSubmitting}
              className="flex-1 h-12"
              style={{backgroundColor: '#2a6b68'}}
            >
              {form.isSubmitting ? 'Добавление...' : 'Добавить'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border"
              style={{backgroundColor: 'transparent', borderColor: '#114643', color: 'white'}}
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

