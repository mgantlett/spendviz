import { create } from 'zustand';
import type { CategorizationRule } from '../types/categorizationRule';

interface CategorizationRulesState {
  rules: CategorizationRule[];
  isLoading: boolean;
  error: string | null;
  fetchRules: (apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<void>;
  addRule: (rule: Omit<CategorizationRule, 'id' | 'created_at' | 'category_name'>, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<CategorizationRule | null>;
  updateRule: (id: number, rule: Partial<CategorizationRule>, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<CategorizationRule | null>;
  deleteRule: (id: number, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<boolean>;
}

export const useCategorizationRulesStore = create<CategorizationRulesState>((set) => ({
  rules: [],
  isLoading: false,
  error: null,
  fetchRules: async (apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categorization-rules`);
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      set({ rules: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  addRule: async (rule, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categorization-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!response.ok) throw new Error('Failed to add rule');
      const newRule = await response.json();
      set((state) => ({ rules: [...state.rules, newRule], isLoading: false }));
      return newRule;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },
  updateRule: async (id, rule, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categorization-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!response.ok) throw new Error('Failed to update rule');
      const updatedRule = await response.json();
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updatedRule : r)),
        isLoading: false,
      }));
      return updatedRule;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },
  deleteRule: async (id, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categorization-rules/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete rule');
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },
}));
