import { apiClient, CashTransaction } from '@/lib/api'
import { useAsync, useMutation } from '@/hooks/useAsync'
import { toast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'

export type TransactionType = 'expense' | 'income'

interface CashTransactionFormData {
  city: string
  amount: string
  purpose: string
  comment: string
  receipt: File | null
}

export function useCashTransactions(type: TransactionType) {
  const { user } = useAuthStore()
  const directorCities = user?.cities || []

  const {
    data: transactions,
    loading,
    error,
    refetch,
  } = useAsync<CashTransaction[]>(
    () => (type === 'expense' ? apiClient.getCashExpense() : apiClient.getCashIncome()),
    [type]
  )

  const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0

  const { mutate: createTransaction, loading: creating } = useMutation(
    async (data: CashTransactionFormData) => {
      const { city, amount, purpose, comment, receipt } = data

      const cities = directorCities.map((cityItem) => ({
        value: cityItem.toLowerCase().replace(/\s+/g, '_'),
        label: cityItem,
      }))

      const cityName = cities.find((c) => c.value === city)?.label || directorCities[0] || 'Москва'

      let receiptDoc = undefined
      if (receipt) {
        const uploadFn = type === 'expense' ? apiClient.uploadCashExpenseReceipt : apiClient.uploadCashIncomeReceipt
        const result = await uploadFn.call(apiClient, receipt)
        receiptDoc = result.filePath
      }

      return apiClient.createCashTransaction({
        name: type === 'expense' ? 'расход' : 'приход',
        amount: Number(amount),
        city: cityName,
        note: comment,
        paymentPurpose: purpose,
        receiptDoc,
      })
    },
    {
      onSuccess: () => {
        toast.success(`${type === 'expense' ? 'Расход' : 'Приход'} успешно добавлен`)
        refetch()
      },
      onError: (mutationError) => {
        toast.error(`Ошибка: ${mutationError.message}`)
      },
    }
  )

  return {
    transactions: transactions || [],
    totalAmount,
    loading,
    error,
    creating,
    createTransaction,
    refetch,
    directorCities,
  }
}
