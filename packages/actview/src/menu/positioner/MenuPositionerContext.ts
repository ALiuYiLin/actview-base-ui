import type { ComputedRef } from '@actview/core';
import type { StyleValue } from '@/internals/types';
import type { Align, Side } from '@/internals/useAnchorPositioning';
import { createContext } from '@/internals/createContext';

// The React version picks `context` from `UseAnchorPositioningReturnValue` (a FloatingTree node
// context). ActView's `useAnchorPositioning` drops that (its `context` is always `undefined`), so
// the positioner publishes its `nodeId` here instead.
export interface MenuPositionerContext {
  side: ComputedRef<Side>;
  align: ComputedRef<Align>;
  arrowRef: { current: Element | null };
  arrowUncentered: ComputedRef<boolean>;
  arrowStyles: ComputedRef<StyleValue>;
  context: { nodeId: string | undefined };
}

export const MenuPositionerContext = createContext<MenuPositionerContext | undefined>(
  'base-ui-menu-positioner-context',
  undefined,
);

export function useMenuPositionerContext(optional?: false): ComputedRef<MenuPositionerContext>;
export function useMenuPositionerContext(optional: true): ComputedRef<MenuPositionerContext | undefined>;
export function useMenuPositionerContext(optional = true): ComputedRef<MenuPositionerContext | undefined> {
  const context = MenuPositionerContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: MenuPositionerContext is missing. MenuPositioner parts must be placed within <Menu.Positioner>.',
    );
  }
  return context as ComputedRef<MenuPositionerContext | undefined>;
}
