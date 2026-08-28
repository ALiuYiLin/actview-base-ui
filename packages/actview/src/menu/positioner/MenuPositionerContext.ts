import { createContext } from 'actview';
import type { Ref } from 'actview';

export type MenuPositionerContext = {
  nodeId: string | undefined;
  side: 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
  align: 'start' | 'center' | 'end';
  arrowRef: Ref<Element | null>;
  arrowUncentered: boolean;
  arrowStyles: any;
  context: {
    nodeId: string | undefined;
  };
};

export const MenuPositionerContext = createContext<MenuPositionerContext | undefined>(
  undefined,
);

export function useMenuPositionerContext(optional?: boolean): MenuPositionerContext | undefined {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = MenuPositionerContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuPositionerContext is missing. MenuPositioner parts must be placed within <Menu.Positioner>.',
    );
  }
  return context;
}
