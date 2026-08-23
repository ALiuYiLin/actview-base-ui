import { computed, createContext } from 'actview';
import type { ComputedRef } from 'actview';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContextValue = {
  direction: TextDirection;
};

export const DirectionContext = createContext<DirectionContextValue | undefined>(undefined);

/**
 * Consumer hook（actview 范式）：setup 顶层调用，返回 ComputedRef；
 * render 里读 `.value` 取最新方向（actview 的 Context.use() 只能在 setup
 * 执行期调用——render 阶段无 currentInstance，见 AD-42）。
 */
export function useDirection(): ComputedRef<TextDirection> {
  const context = DirectionContext.use();
  return computed(() => context.value?.direction ?? 'ltr');
}
