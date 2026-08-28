import { createContext } from 'actview';

export interface ToolbarGroupContext {
  disabled: boolean;
}

export const ToolbarGroupContext = createContext<ToolbarGroupContext | undefined>(undefined);

export function useToolbarGroupContext(): ToolbarGroupContext | undefined {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined）。
  return ToolbarGroupContext.use();
}
