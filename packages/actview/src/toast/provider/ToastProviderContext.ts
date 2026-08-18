import type { ComputedRef } from '@actview/core';
import type { ToastStore } from '../store';
import { createContext } from '../../internals/createContext';

export type ToastContext = ToastStore;

export const ToastContext = createContext<ToastContext | undefined>('base-ui-toast-context', undefined);

export function useToastProviderContext() {
  const context = ToastContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: useToastManager must be used within <Toast.Provider>.');
  }
  return context as ComputedRef<ToastContext>;
}
