import { defineComponent, toValue } from 'actview';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 */
export const MenuArrow = defineComponent(function MenuArrow(componentProps: MenuArrow.Props) {
  const children = toValue(componentProps.children);

  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext();
  const {arrowRef, side, align, arrowUncentered, arrowStyles} = positionerContext.value ?? {
    arrowRef: {current: null as Element | null},
    side: 'bottom' as Side,
    align: 'center' as Align,
    arrowUncentered: false,
    arrowStyles: undefined as any,
  };
  const open = store.useState('open');

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const state: MenuArrowState = {
      open: open.value,
      side,
      align,
      uncentered: arrowUncentered,
    };

    const attributes: Record<string, string> = {};
    const mapping: any = popupStateMapping;
    const openAttr = mapping.open(open.value);
    if (openAttr) {
      Object.assign(attributes, openAttr);
    }

    const merged: any = {
      style: arrowStyles?.value ?? arrowStyles,
      'aria-hidden': true,
      ...elementProps,
      ...attributes,
    };

    const mergedRefs = (el: HTMLDivElement | null) => {
      arrowRef.current = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
        componentProps.ref.current = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{children}</div>;
  };
});

export interface MenuArrowState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface MenuArrowProps extends BaseUIComponentProps<'div', MenuArrowState> {}

export namespace MenuArrow {
  export type State = MenuArrowState;
  export type Props = MenuArrowProps;
}
