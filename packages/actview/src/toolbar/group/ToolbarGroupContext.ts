import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface ToolbarGroupContext {
  disabled: boolean;
}

export const ToolbarGroupContext = createContext<ToolbarGroupContext | undefined>(undefined);

export function useToolbarGroupContext(): Ref<ToolbarGroupContext | undefined> {
  return ToolbarGroupContext.use();
}
