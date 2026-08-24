import { defineComponent, ref, toValue } from 'actview';
import { MenubarContext, useMenubarContext } from './MenubarContext';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * A horizontal or vertical menu bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menubar](https://base-ui.com/react/components/menubar)
 */
export const Menubar = defineComponent(function Menubar(props: Menubar.Props) {
  const {
    modal = false,
    disabled = false,
    orientation = 'horizontal',
    allowMouseUpTriggerRef = {value: false},
    children,
  } = props as any;

  const contentElement = ref<HTMLElement | null>(null);
  const hasSubmenuOpen = ref(false);

  const state = (): MenubarState => ({
    modal,
    hasSubmenuOpen: hasSubmenuOpen.value,
    orientation,
  });

  const context = {
    modal,
    disabled,
    contentElement: contentElement.value,
    setContentElement: (element: HTMLElement | null) => (contentElement.value = element),
    hasSubmenuOpen: hasSubmenuOpen.value,
    setHasSubmenuOpen: (open: boolean) => (hasSubmenuOpen.value = open),
    orientation,
    allowMouseUpTriggerRef,
    rootId: (props as any).id,
  };

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const child = typeof children === 'function' ? children(state()) : toValue(children);

    const merged: any = {
      role: 'menubar',
      'aria-orientation': orientation,
      ...elementProps,
    };

    if (modal) {
      merged['data-modal'] = '';
    }
    merged['data-orientation'] = orientation;

    const mergedRefs = (el: HTMLElement | null) => {
      contentElement.value = el;
      if (typeof props.ref === 'function') {
        (props.ref as any)(el);
      } else if (props.ref) {
        (props.ref as any).value = el;
        
      }
    };

    const element = (() => {
      if (render) {
        if (typeof render === 'function') {
          return render({...merged, ...state(), ref: mergedRefs} as any);
        }
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{child}</Tag>;
      }
      return <div {...merged} ref={mergedRefs}>{child}</div>;
    })();

    return (
      <MenubarContext.Provider value={context as any}>
        {element}
      </MenubarContext.Provider>
    );
  };
});

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

