import type { ComputedRef } from '@actview/core';
import type { Orientation } from '../../internals/types';
import { createContext } from '../../internals/createContext';

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
export function useToolbarRootContext(
  optional = false,
): ComputedRef<ToolbarRootContext | undefined> {
  const context = ToolbarRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}
