import { defineComponent, toValue } from 'actview';
import { MenuRoot } from '../root/MenuRoot';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuSubmenuRootContext } from './MenuSubmenuRootContext';

export { useMenuSubmenuRootContext } from './MenuSubmenuRootContext';

/**
 * Groups all parts of a submenu.
 * Doesn't render its own HTML element.
 */
export const MenuSubmenuRoot = defineComponent(function MenuSubmenuRoot(
  props: MenuSubmenuRoot.Props,
) {
  const parentMenu = useMenuRootContext().store;

  const contextValue = {parentMenu};

  const children = toValue(props.children);

  return () => (
    <MenuSubmenuRootContext.Provider value={contextValue}>
      <MenuRoot {...(props as any)}>{children}</MenuRoot>
    </MenuSubmenuRootContext.Provider>
  );
});

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
