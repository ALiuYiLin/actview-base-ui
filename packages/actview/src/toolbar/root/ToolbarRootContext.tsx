import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { Orientation } from '../../internals/types';

export interface ToolbarRootContext {
  disabled: boolean;
  orientation: Orientation;
}

export const ToolbarRootContext = createContext<ToolbarRootContext | undefined>(
  'base-ui-toolbar-root-context',
  undefined,
);

export function useToolbarRootContext(optional?: false): ComputedRef<ToolbarRootContext>;
export function useToolbarRootContext(optional: true): ComputedRef<ToolbarRootContext | undefined>;
export function useToolbarRootContext(optional?: boolean) {
  const context = ToolbarRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}
