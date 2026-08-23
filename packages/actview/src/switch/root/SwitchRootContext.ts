import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { SwitchRootState } from './SwitchRoot';

export type SwitchRootContext = SwitchRootState;

export const SwitchRootContext = createContext<SwitchRootContext | undefined>(undefined);

export function useSwitchRootContext(): Ref<SwitchRootContext> {
  const context = SwitchRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
    );
  }

  return context as unknown as Ref<SwitchRootContext>;
}
