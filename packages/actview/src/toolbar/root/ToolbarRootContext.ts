import { createContext } from 'actview';
import type { Orientation } from '@/internals/types';

export interface ToolbarRootContext {
  disabled: boolean;
  orientation: Orientation;
}

export const ToolbarRootContext = createContext<ToolbarRootContext | undefined>(undefined);

export function useToolbarRootContext(optional?: false): ToolbarRootContext;
export function useToolbarRootContext(optional: true): ToolbarRootContext | undefined;
export function useToolbarRootContext(optional?: boolean) {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined）。
  const context = ToolbarRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}
