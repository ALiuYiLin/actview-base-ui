import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { MenubarContext } from './MenubarContext';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A horizontal or vertical menu bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menubar](https://base-ui.com/react/components/menubar)
 */
export function Menubar(props: Menubar.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const modal = computed(() => props.modal ?? false);
  const disabled = computed(() => props.disabled ?? false);
  const orientation = computed(() => props.orientation ?? 'horizontal');

  const contentElement = ref<HTMLElement | null>(null);
  const hasSubmenuOpen = ref(false);

  // 值形 props toRefs 活引用；children 不解构（render prop）。
  const { className, render, style, ...elementRefs } = toRefs(props as any) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenubarState>(() => ({
    modal: modal.value,
    hasSubmenuOpen: hasSubmenuOpen.value,
    orientation: orientation.value,
  }));

  // children 兼容 render prop（渲染期求值）。
  const childrenOverride = computed(() => {
    const child = elementRefs.children?.value;
    return typeof child === 'function' ? child(state.value) : child;
  });

  const rootProps = computed<Record<string, any>>(() => ({
    role: 'menubar',
    'aria-orientation': orientation.value,
    ...(modal.value ? {'data-modal': ''} : {}),
    'data-orientation': orientation.value,
    ...elementProps.value,
    children: childrenOverride.value,
  }));

  // store-as-is 载体：身份稳定的 getter 对象——contentElement/hasSubmenuOpen/
  // modal/disabled/orientation 渲染期求值。
  const contextValue = {
    get modal() {
      return modal.value;
    },
    get disabled() {
      return disabled.value;
    },
    get contentElement() {
      return contentElement.value;
    },
    setContentElement: (element: HTMLElement | null) => (contentElement.value = element),
    get hasSubmenuOpen() {
      return hasSubmenuOpen.value;
    },
    setHasSubmenuOpen: (open: boolean) => (hasSubmenuOpen.value = open),
    get orientation() {
      return orientation.value;
    },
    allowMouseUpTriggerRef: props.allowMouseUpTriggerRef ?? {value: false},
    rootId: (props as any).id,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenubarContext.Provider value={contextValue as any}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(contentElement as any, (props as any).ref),
          props: rootProps.value,
        },
      )}
    </MenubarContext.Provider>
  );
}

export interface MenubarState {
  /**
   * Whether the menubar is modal.
   */
  modal: boolean;
  /**
   * Whether a submenu is currently open.
   */
  hasSubmenuOpen: boolean;
  /**
   * The orientation of the menubar.
   */
  orientation: MenuRoot.Orientation;
}

export interface MenubarProps extends BaseUIComponentProps<'div', MenubarState> {
  /**
   * Whether the menubar is modal.
   * @default false
   */
  modal?: boolean | undefined;
  /**
   * Whether the menubar is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The orientation of the menubar.
   * @default 'horizontal'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Ref to allow mouse-up triggering.
   */
  allowMouseUpTriggerRef?: {value: boolean} | undefined;
  children?: any;
  [key: string]: any;
}

export namespace Menubar {
  export type State = MenubarState;
  export type Props = MenubarProps;
}
