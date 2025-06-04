import { create } from 'zustand';
import type { Transaction } from '../types/transaction';

interface TransactionsState {
  transactions: Transaction[];
  totalItems: number;
  isLoading: boolean;
  error: string | null;
  fetchTransactions: (apiCall: (url: string, options?: RequestInit) => Promise<Response>, params?: {
    accountId?: number | null;
    description?: string;
    startDate?: string;
    endDate?: string;
    categoryId?: number | null;
    sortColumn?: keyof Transaction | 'account_name' | 'category_name';
    sortDirection?: 'asc' | 'desc';
    currentPage?: number;
    itemsPerPage?: number;
  }) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  totalItems: 0,
  isLoading: false,
  error: null,
  async fetchTransactions(apiCall, params = {}) {
    set({ isLoading: true, error: null });
    try {
      const {
        accountId,
        description,
        startDate,
        endDate,
        categoryId,
        sortColumn = 'date',
        sortDirection = 'desc',
        currentPage = 1,
        itemsPerPage = 10,
      } = params;
      const urlParams = new URLSearchParams();
      if (accountId) urlParams.append('account_id', accountId.toString());
      if (description) urlParams.append('description', description);
      if (startDate) urlParams.append('startDate', startDate);
      if (endDate) urlParams.append('endDate', endDate);
      if (categoryId !== undefined) {
        urlParams.append('category_id', categoryId === null ? 'null' : categoryId.toString());
      }
      urlParams.append('sort', sortColumn);
      urlParams.append('direction', sortDirection);
      urlParams.append('page', currentPage.toString());
      urlParams.append('limit', itemsPerPage.toString());
      const res = await apiCall(`/api/transactions?${urlParams}`);
      if (!res.ok) {
        let errorResponseMessage = 'Failed to fetch transactions';
        try {
          const errorData = await res.json();
          errorResponseMessage = errorData.message || errorData.error || errorResponseMessage;
        } catch {
          errorResponseMessage = res.statusText || errorResponseMessage;
        }
        throw new Error(errorResponseMessage);
      }
      const data = await res.json();
      if (data && Array.isArray(data.transactions) && typeof data.totalItems === 'number') {
        set({ transactions: data.transactions, totalItems: data.totalItems, isLoading: false });
      } else if (Array.isArray(data)) {
        set({ transactions: data, totalItems: data.length, isLoading: false });
      } else {
        set({ transactions: [], totalItems: 0, isLoading: false, error: 'Received invalid data format from server.' });
      }
    } catch (err: unknown) {
      set({ transactions: [], totalItems: 0, isLoading: false, error: (err as Error).message || 'An unknown error occurred while fetching transactions.' });
    }
  },
}));
