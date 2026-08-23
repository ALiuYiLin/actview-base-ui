import { createContext } from 'actview';
import type { Ref } from 'actview';

export type MenuPositionerContext = {
  nodeId: string | undefined;
  side: 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
  align: 'start' | 'center' | 'end';
  arrowRef: {current: HTMLDivElement | null};
  arrowUncentered: boolean;
  arrowStyles: any;
  context: {
    nodeId: string | undefined;
  };
};

export const MenuPositionerContext = createContext<MenuPositionerContext | undefined>(
  undefined,
);

export function useMenuPositionerContext(
  optional?: boolean,
): Ref<MenuPositionerContext | undefined> {
  const context = MenuPositionerContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: MenuPositionerContext is missing. MenuPositioner parts must be placed within <Menu.Positioner>.',
    );
  }
  return context;
}
