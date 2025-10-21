/**
 * Custom hook для работы с кассовыми операциями
 * Устраняет дублирование логики в expense и income страницах
 */

import { useState } from 'react';
import { apiClient, CashTransaction } from '@/lib/api';
import { useAsync, useMutation } from './useAsync';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/auth.store';

export type TransactionType = 'expense' | 'income';

interface CashTransactionFormData {
  city: string;
  amount: string;
  purpose: string;
  comment: string;
  receipt: File | null;
}

export function useCashTransactions(type: TransactionType) {
  const { user } = useAuthStore();
  const directorCities = user?.cities || [];

  // Загрузка транзакций
  const {
    data: transactions,
    loading,
    error,
    refetch,
  } = useAsync<CashTransaction[]>(
    () => type === 'expense' ? apiClient.getCashExpense() : apiClient.getCashIncome(),
    [type]
  );

  // Подсчёт общей суммы
  const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  // Создание транзакции
  const {
    mutate: createTransaction,
    loading: creating,
  } = useMutation(
    async (data: CashTransactionFormData) => {
      const { city, amount, purpose, comment, receipt } = data;
      
      // Определяем имена
      const cities = directorCities.map(city => ({
        value: city.toLowerCase().replace(/\s+/g, '_'),
        label: city,
      }));
      
      const cityName = cities.find(c => c.value === city)?.label || directorCities[0] || 'Москва';
      
      // Загрузка файла если есть
      let receiptDoc = undefined;
      if (receipt) {
        const uploadFn = type === 'expense' 
          ? apiClient.uploadCashExpenseReceipt 
          : apiClient.uploadCashIncomeReceipt;
        
        const result = await uploadFn.call(apiClient, receipt);
        receiptDoc = result.filePath;
      }
      
      // Создаём транзакцию
      const transactionData = {
        name: type === 'expense' ? 'расход' : 'приход',
        amount: Number(amount),
        city: cityName,
        note: comment,
        paymentPurpose: purpose,
        receiptDoc,
      };
      
      return apiClient.createCashTransaction(transactionData);
    },
    {
      onSuccess: () => {
        toast.success(`${type === 'expense' ? 'Расход' : 'Приход'} успешно добавлен`);
        refetch();
      },
      onError: (error) => {
        toast.error(`Ошибка: ${error.message}`);
      },
    }
  );

  return {
    transactions: transactions || [],
    totalAmount,
    loading,
    error,
    creating,
    createTransaction,
    refetch,
    directorCities,
  };
}

