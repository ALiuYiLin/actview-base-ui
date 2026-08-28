import { createContext } from 'actview';
import type { ToastStore } from '../store';

export const ToastProviderContext = createContext<ToastStore<any> | undefined>(undefined);

export function useToastProviderContext(optional = true): any {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = ToastProviderContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Toast.Provider> is missing.');
  }
  return context;
}