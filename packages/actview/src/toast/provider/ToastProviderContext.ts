import { createContext } from 'actview';
import type { ToastStore } from '../store';

export const ToastProviderContext = createContext<ToastStore<any> | undefined>(undefined);

export function useToastProviderContext(optional = true): any {
  const context = ToastProviderContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Toast.Provider> is missing.');
  }
  return context.value;
}
