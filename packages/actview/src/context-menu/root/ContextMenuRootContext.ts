import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { ContextMenuRoot } from './ContextMenuRoot';

export interface ContextMenuRootContext {
  anchor: {getBoundingClientRect: () => DOMRect};
  setAnchor: (anchor: ContextMenuRootContext['anchor']) => void;
  backdropRef: {value: HTMLDivElement | null};
  internalBackdropRef: {value: HTMLDivElement | null};
  actionsRef: {value: {
    setOpen: (nextOpen: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void;
  } | null};
  positionerRef: {value: HTMLElement | null};
  allowMouseUpTriggerRef: {value: boolean};
  initialCursorPointRef: {value: {x: number; y: number} | null};
  rootId: string | undefined;
}

export const ContextMenuRootContext = createContext<ContextMenuRootContext | undefined>(
  undefined,
);

export function useContextMenuRootContext(optional: false): ContextMenuRootContext;
export function useContextMenuRootContext(optional?: true): ContextMenuRootContext | undefined;
export function useContextMenuRootContext(optional = true) {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = ContextMenuRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ContextMenuRootContext is missing. ContextMenu parts must be placed within <ContextMenu.Root>.',
    );
  }
  return context;
}
