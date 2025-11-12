/**
 * Custom hook для работы с заказами
 * Инкапсулирует логику загрузки и обновления заказа
 */

import { useState, useCallback } from 'react';
import { apiClient, Order, Master, Call } from '@/lib/api';
import { useAsync, useMutation } from './useAsync';
import { toast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

export function useOrder(orderId: string) {
  // Загрузка заказа
  const {
    data: order,
    loading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useAsync<Order>(
    () => apiClient.getOrder(Number(orderId)),
    [orderId],
    {
      onError: (error) => {
        toast.error(`Ошибка загрузки заказа: ${error.message}`);
      },
    }
  );

  // Загрузка мастеров
  const {
    data: mastersData,
    loading: mastersLoading,
  } = useAsync<Master[]>(
    () => apiClient.getMasters(),
    [],
    {
      onError: (error) => {
        logger.error('Failed to load masters', error);
      },
    }
  );

  // Фильтруем мастеров только со статусом "работает"
  const masters = (mastersData || []).filter(master => {
    const status = (master.statusWork || '').toLowerCase();
    return status.includes('работает') || status.includes('работающий') || status === 'active';
  });

  // Обновление заказа
  const {
    mutate: updateOrder,
    loading: updating,
  } = useMutation(
    (data: Partial<Order>) => apiClient.updateOrder(Number(orderId), data),
    {
      onSuccess: () => {
        toast.success('Заказ успешно обновлен');
        refetchOrder();
      },
      onError: (error) => {
        toast.error(`Ошибка обновления заказа: ${error.message}`);
      },
    }
  );

  const loading = orderLoading || mastersLoading;
  const error = orderError;

  return {
    order,
    masters,
    loading,
    error,
    updating,
    updateOrder,
    refetchOrder,
  };
}

/**
 * Hook для работы со звонками заказа
 */
export function useOrderCalls(orderId: string) {
  const {
    data: calls,
    loading,
    error,
    refetch,
  } = useAsync<Call[]>(
    () => apiClient.getCallsByOrderId(Number(orderId)),
    [orderId],
    {
      immediate: false,
      onError: (error) => {
        logger.error('Failed to load calls', error);
      },
    }
  );

  return {
    calls: calls || [],
    loading,
    error,
    loadCalls: refetch,
  };
}

