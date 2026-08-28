import { computed } from 'actview';
import { DrawerRootContext } from '../root/DrawerRootContext';
import type { DrawerSwipeDirection } from '../root/DrawerRootContext';

/**
 * Provides drawer context (e.g. swipe direction) to drawer parts.
 *
 * actview 简化：仅提供 swipeDirection；react 版的 nested 注册/滑动进度跟踪未迁移。
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerProvider(props: DrawerProvider.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const openDirection = computed(() => props.openDirection ?? 'left');

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <DrawerRootContext.Provider
      value={{get swipeDirection() { return openDirection.value as DrawerSwipeDirection; }}}
    >
      {props.children}
    </DrawerRootContext.Provider>
  );
}

export interface DrawerProviderState {}

export interface DrawerProviderProps {
  children?: any;
  /**
   * Direction to open the drawer from.
   * @default 'left'
   */
  openDirection?: 'left' | 'right' | 'up' | 'down' | undefined;
  [key: string]: any;
}

export namespace DrawerProvider {
  export type State = DrawerProviderState;
  export type Props = DrawerProviderProps;
}
