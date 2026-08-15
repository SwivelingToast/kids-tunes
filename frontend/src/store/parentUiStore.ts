import { create } from 'zustand';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

interface ParentUiState {
  toast: string;
  flash: (message: string) => void;
}

// Small standalone store (mirrors the kid store's toast pattern) so every
// parent-side panel can flash a confirmation without each one reinventing
// its own toast timer/state.
export const useParentUiStore = create<ParentUiState>((set) => ({
  toast: '',
  flash: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => set({ toast: '' }), 2200);
  },
}));
