import { computed, createContext } from 'actview';
import type { ComputedRef } from 'actview';

export interface CSPContextValue {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}

export const CSPContext = createContext<CSPContextValue | undefined>(undefined);

const DEFAULT_CSP_CONTEXT_VALUE: CSPContextValue = {
  disableStyleElements: false,
};

/**
 * Returns the current CSP configuration as a `ComputedRef`.
 * (actview 版：React 的 useContext 每次 render 读最新值 → 这里返回
 * ComputedRef，消费方在 render 里读 `.value` 建立追踪（同 useDirection）。
 * 无 `<CSPProvider>` 时回退默认值 `{ disableStyleElements: false }`。)
 */
export function useCSPContext(): ComputedRef<CSPContextValue> {
  const context = CSPContext.use();
  return computed(() => context ?? DEFAULT_CSP_CONTEXT_VALUE);
}
