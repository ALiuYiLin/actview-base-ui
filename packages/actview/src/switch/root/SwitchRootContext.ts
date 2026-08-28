import { createContext } from 'actview';
import type { SwitchRootState } from './SwitchRoot';

export type SwitchRootContext = SwitchRootState;

export const SwitchRootContext = createContext<SwitchRootContext | undefined>(undefined);

export function useSwitchRootContext(): SwitchRootContext {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined → 抛缺上下文错误）。
  const context = SwitchRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
    );
  }

  return context;
}
