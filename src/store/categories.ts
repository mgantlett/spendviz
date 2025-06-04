import { create } from 'zustand';
import { Category } from '../types/category';

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<void>;
  addCategory: (name: string, apiCall: (url: string, options?: RequestInit) => Promise<Response>, parent_id?: number | null) => Promise<Category | null>;
  updateCategory: (id: number, name: string, apiCall: (url: string, options?: RequestInit) => Promise<Response>, parent_id?: number | null) => Promise<Category | null>;
  deleteCategory: (id: number, apiCall: (url: string, options?: RequestInit) => Promise<Response>) => Promise<boolean>;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,
  fetchCategories: async (apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categories`);
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }
      const data = await response.json();
      set({ categories: data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
  },
  addCategory: async (name, apiCall, parent_id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add category: ${response.statusText}`);
      }
      const newCategory = await response.json();
      set((state) => ({
        categories: [...state.categories, newCategory].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return newCategory;
    } catch (error) {
      console.error(error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return null;
    }
  },
  updateCategory: async (id, name, apiCall, parent_id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update category: ${response.statusText}`);
      }
      const updatedCategory = await response.json();
      set((state) => ({
        categories: state.categories.map((cat) => (cat.id === id ? updatedCategory : cat)).sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return updatedCategory;
    } catch (error) {
      console.error(error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return null;
    }
  },
  deleteCategory: async (id, apiCall) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete category: ${response.statusText}`);
      }
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      console.error(error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return false;
    }
  },
}));
