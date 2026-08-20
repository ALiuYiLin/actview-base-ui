import { computed } from 'actview';
import { createContext } from 'actview';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: TextDirection;
};

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期读 .value 建立响应式追踪（对照 ToggleGroupContext）
export const DirectionContext = createContext<DirectionContext | undefined>(undefined);

/**
 * Returns a computed ref of the current text direction.
 * Read `.value` inside render functions.
 */
export function useDirection() {
  // `use()` 必须在 setup 调用（依赖 useInjects），渲染期读 .value 追踪；
  // computed 包一层保持消费者 `.value` 读取形态（无 Provider 时回落 'ltr'）
  const context = DirectionContext.use();
  return computed(() => context.value?.direction ?? 'ltr');
}
