import { ref } from 'actview';
import { useId } from '@/utils/useId';
import { ContextMenuRootContext } from './ContextMenuRootContext';
import { Menu } from '@/menu';
import { MenuRootContext } from '@/menu/root/MenuRootContext';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { MenuRoot } from '@/menu/root/MenuRoot';

/**
 * A component that creates a context menu activated by right clicking or long pressing.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export function ContextMenuRoot(props: ContextMenuRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const anchorRef = ref({
    getBoundingClientRect() {
      return DOMRect.fromRect({width: 0, height: 0, x: 0, y: 0});
    },
  } as ContextMenuRootContext['anchor']);
  const setAnchor = (anchor: ContextMenuRootContext['anchor']) => {
    anchorRef.value = anchor;
  };

  const backdropRef = ref(null as HTMLDivElement | null);
  const internalBackdropRef = ref(null as HTMLDivElement | null);
  const actionsRef = ref<{
    setOpen: (nextOpen: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void;
  } | null>(null);
  const positionerRef = ref(null as HTMLElement | null);
  const allowMouseUpTriggerRef = ref(true);
  const initialCursorPointRef = ref(null as {x: number; y: number} | null);
  const id = useId();

  // store-as-is 载体：身份稳定的 getter 对象——anchor 渲染期求值
  // （setup 快照会让右键定位永远停在初始虚拟锚点）。
  const contextValue: ContextMenuRootContext = {
    get anchor() {
      return anchorRef.value;
    },
    setAnchor,
    actionsRef,
    backdropRef,
    internalBackdropRef,
    positionerRef,
    allowMouseUpTriggerRef,
    initialCursorPointRef,
    rootId: id,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 渲染期直读（setup 快照会让动态 children 永远停留首次渲染）。
  return (
    <ContextMenuRootContext.Provider value={contextValue}>
      <MenuRootContext.Provider value={undefined}>
        <Menu.Root {...(props as any)}>{props.children}</Menu.Root>
      </MenuRootContext.Provider>
    </ContextMenuRootContext.Provider>
  );
}

export interface ContextMenuRootState {}

export interface ContextMenuRootProps extends Omit<
  Menu.Root.Props,
  // Context Menu has no detached-trigger support.
  | 'handle'
  | 'triggerId'
  | 'defaultTriggerId'
  | 'modal'
  | 'openOnHover'
  | 'delay'
  | 'closeDelay'
  | 'onOpenChange'
  | 'children'
> {
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void)
    | undefined;
  children?: any;
}

export type ContextMenuRootActions = MenuRoot.Actions;
export type ContextMenuRootChangeEventReason = MenuRoot.ChangeEventReason;
export type ContextMenuRootChangeEventDetails =
  BaseUIChangeEventDetails<ContextMenuRoot.ChangeEventReason>;

export namespace ContextMenuRoot {
  export type State = ContextMenuRootState;
  export type Props = ContextMenuRootProps;
  export type Actions = ContextMenuRootActions;
  export type ChangeEventReason = ContextMenuRootChangeEventReason;
  export type ChangeEventDetails = ContextMenuRootChangeEventDetails;
}
