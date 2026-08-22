import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';
import type { SwitchRootState } from '@/switch/root/SwitchRoot';

export type SwitchRootContext = SwitchRootState;

export const SwitchRootContext = createContext<SwitchRootContext | undefined>(
  'base-ui-switch-root-context',
  undefined,
);

export function useSwitchRootContext(): ComputedRef<SwitchRootState> {
  const context = SwitchRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
    );
  }

  return context as ComputedRef<SwitchRootState>;
}
