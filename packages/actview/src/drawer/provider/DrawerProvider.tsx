import { defineComponent } from 'actview';
import { DrawerRootContext } from '../root/DrawerRootContext';
import type { DrawerSwipeDirection } from '../root/DrawerRootContext';

/**
 * Provides drawer context (e.g. swipe direction) to drawer parts.
 *
 * actview 简化：仅提供 swipeDirection；react 版的 nested 注册/滑动进度跟踪未迁移。
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export const DrawerProvider = defineComponent(function DrawerProvider(
  props: DrawerProvider.Props,
) {
  const {openDirection = 'left', children} = props as any;

  return () => (
    <DrawerRootContext.Provider value={{swipeDirection: openDirection as DrawerSwipeDirection}}>
      {children}
    </DrawerRootContext.Provider>
  );
});

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
