import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { Orientation } from '@/internals/types';

export interface ToolbarRootContext {
  disabled: boolean;
  orientation: Orientation;
}

export const ToolbarRootContext = createContext<ToolbarRootContext | undefined>(undefined);

export function useToolbarRootContext(optional?: false): Ref<ToolbarRootContext>;
export function useToolbarRootContext(optional: true): Ref<ToolbarRootContext | undefined>;
export function useToolbarRootContext(optional?: boolean) {
  const context = ToolbarRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}
