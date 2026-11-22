import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'error';
  message: string;
}

interface ToastState {
  toasts: ToastMessage[];
  pushToast: (tone: 'success' | 'error', message: string) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

let toastCounter = 0;

function makeToast(tone: 'success' | 'error', message: string): ToastMessage {
  toastCounter += 1;
  return { id: `toast-${Date.now()}-${toastCounter}`, tone, message };
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (tone, message) => {
    const next = makeToast(tone, message);
    set((state) => ({
      toasts: [...state.toasts.slice(-2), next],
    }));
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));
