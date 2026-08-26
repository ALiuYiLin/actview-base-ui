import { MenuRoot } from '../root/MenuRoot';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuSubmenuRootContext } from './MenuSubmenuRootContext';

export { useMenuSubmenuRootContext } from './MenuSubmenuRootContext';

/**
 * Groups all parts of a submenu.
 * Doesn't render its own HTML element.
 */
export function MenuSubmenuRoot(props: MenuSubmenuRoot.Props) {
  // ============ setup（只执行一次） ============
  const parentMenu = useMenuRootContext().store;

  const contextValue = {parentMenu};

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuSubmenuRootContext.Provider value={contextValue}>
      <MenuRoot {...(props as any)}>{props.children}</MenuRoot>
    </MenuSubmenuRootContext.Provider>
  );
}

export interface MenuSubmenuRootProps {
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: any) => void) | undefined;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default false
   */
  closeParentOnEsc?: boolean | undefined;
  /**
   * The content of the submenu.
   */
  children?: any;
  [key: string]: any;
}

export interface MenuSubmenuRootState {}

export type MenuSubmenuRootChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuSubmenuRootChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuSubmenuRoot {
  export type Props = MenuSubmenuRootProps;
  export type State = MenuSubmenuRootState;
  export type ChangeEventReason = MenuSubmenuRootChangeEventReason;
  export type ChangeEventDetails = MenuSubmenuRootChangeEventDetails;
}
