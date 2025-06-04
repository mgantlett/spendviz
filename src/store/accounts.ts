import { create } from 'zustand';
import type { Account } from '../types/account';

interface AccountsState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  fetchAccounts: (apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'created_at'>, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<Account | null>;
  updateAccount: (id: number, account: Partial<Account>, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<Account | null>;
  deleteAccount: (id: number, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<boolean>;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  isLoading: false,
  error: null,
  fetchAccounts: async (apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/accounts`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      set({ accounts: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  addAccount: async (account, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/accounts`, {
        method: 'POST',
        body: JSON.stringify(account),
      });
      if (!response.ok) {
        let errorMsg = 'Failed to add account';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // ignore JSON parse error, fallback to generic error message
        }
        set({ isLoading: false, error: errorMsg });
        return { error: errorMsg };
      }
      const newAccount = await response.json();
      set((state) => ({ accounts: [...state.accounts, newAccount], isLoading: false }));
      return newAccount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      set({ isLoading: false, error: errorMsg });
      return { error: errorMsg };
    }
  },
  updateAccount: async (id, account, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(account),
      });
      if (!response.ok) throw new Error('Failed to update account');
      const updatedAccount = await response.json();
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? updatedAccount : a)),
        isLoading: false,
      }));
      return updatedAccount;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },
  deleteAccount: async (id, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete account');
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },
}));
