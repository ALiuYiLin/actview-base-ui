import { ref, toValue, toRefs, unrefs } from 'actview';
import { MenubarContext, useMenubarContext } from './MenubarContext';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A horizontal or vertical menu bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menubar](https://base-ui.com/react/components/menubar)
 */
export function Menubar(props: Menubar.Props) {
  const {
    modal = false,
    disabled = false,
    orientation = 'horizontal',
    allowMouseUpTriggerRef = {value: false},
  } = props as any;

  const contentElement = ref<HTMLElement | null>(null);
  const hasSubmenuOpen = ref(false);

  const state = (): MenubarState => ({
    modal,
    hasSubmenuOpen: hasSubmenuOpen.value,
    orientation,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, ...elementProps} = toRefs(props as any);

  const {element} = useRenderElement({
    props: () => [
      {
        role: 'menubar',
        'aria-orientation': orientation,
        ...(modal ? {'data-modal': ''} : {}),
        'data-orientation': orientation,
      },
      unrefs(elementProps),
    ],
    state,
    className,
    style,
    render,
    refs: () => [
      contentElement as any,
      (props as any).ref,
    ],
    // children：render-prop（(state) => any）渲染期求值
    children: () => {
      const {children} = props as any;
      return typeof children === 'function' ? children(state()) : toValue(children);
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // context 渲染期重建（contentElement/hasSubmenuOpen 最新值）
  return (
    <MenubarContext.Provider
      value={
        {
          modal,
          disabled,
          contentElement: contentElement.value,
          setContentElement: (element: HTMLElement | null) => (contentElement.value = element),
          hasSubmenuOpen: hasSubmenuOpen.value,
          setHasSubmenuOpen: (open: boolean) => (hasSubmenuOpen.value = open),
          orientation,
          allowMouseUpTriggerRef,
          rootId: (props as any).id,
        } as any
      }
    >
      {element()}
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

export { useMenubarContext };

