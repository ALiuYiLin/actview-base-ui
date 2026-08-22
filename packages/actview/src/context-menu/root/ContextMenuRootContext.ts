import type { ComputedRef } from '@actview/core';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import { createContext } from '@/internals/createContext';

// The React version references `ContextMenuRoot.ChangeEventDetails`, but `ContextMenu.Root` is
// itself a thin wrapper over `Menu.Root`, so the details are structurally identical to
// `MenuRoot.ChangeEventDetails`. Inline the type here to avoid a dependency on the not-yet-ported
// `ContextMenu.Root` component.
export type ContextMenuRootChangeEventDetails = BaseUIChangeEventDetails<MenuRoot.ChangeEventReason>;

export interface ContextMenuRootContext {
  anchor: { getBoundingClientRect: () => DOMRect };
  setAnchor: (anchor: ContextMenuRootContext['anchor']) => void;
  backdropRef: { current: HTMLDivElement | null };
  internalBackdropRef: { current: HTMLDivElement | null };
  actionsRef: {
    current: {
      setOpen: (nextOpen: boolean, eventDetails: ContextMenuRootChangeEventDetails) => void;
    } | null;
  };
  positionerRef: { current: HTMLElement | null };
  allowMouseUpTriggerRef: { current: boolean };
  initialCursorPointRef: { current: { x: number; y: number } | null };
  rootId: string | undefined;
}

export const ContextMenuRootContext = createContext<ContextMenuRootContext | undefined>(
  'base-ui-context-menu-root-context',
  undefined,
);

export function useContextMenuRootContext(optional?: false): ComputedRef<ContextMenuRootContext>;
export function useContextMenuRootContext(optional?: true): ComputedRef<ContextMenuRootContext | undefined>;
export function useContextMenuRootContext(optional = true): ComputedRef<ContextMenuRootContext | undefined> {
  const context = ContextMenuRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: ContextMenuRootContext is missing. ContextMenu parts must be placed within <ContextMenu.Root>.',
    );
  }
  return context as ComputedRef<ContextMenuRootContext | undefined>;
}
