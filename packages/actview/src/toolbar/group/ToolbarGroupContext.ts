import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export interface ToolbarGroupContext {
  disabled: boolean;
}

export const ToolbarGroupContext = createContext<ToolbarGroupContext | undefined>(
  'base-ui-toolbar-group-context',
  undefined,
);

export function useToolbarGroupContext(): ComputedRef<ToolbarGroupContext | undefined> {
  return ToolbarGroupContext.use();
}
