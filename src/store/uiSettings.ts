import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UISettingsState {
  isDebugVisible: boolean;
  toggleDebug: () => void;
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      isDebugVisible: false,
      toggleDebug: () => set((state) => ({ isDebugVisible: !state.isDebugVisible })),
    }),
    {
      name: 'ui-settings',
    }
  )
);
