import { defineComponent, toValue } from 'actview';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';
import type { Ref } from 'actview';

/**
 * Displays an element positioned against the popover anchor.
 * Renders a `<div>` element.
 */
export const PopoverArrow = defineComponent(function PopoverArrow(
  componentProps: PopoverArrow.Props,
) {
  const children = toValue(componentProps.children);

  const store = usePopoverRootContext(false);
  const positionerContext = usePopoverPositionerContext();
  const {arrowRef, side, align, arrowUncentered, arrowStyles} = positionerContext ?? {
    arrowRef: {value: null as Element | null},
    side: 'bottom' as Side,
    align: 'center' as Align,
    arrowUncentered: false,
    arrowStyles: undefined as any,
  };
  const open = store.useState('open');

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const state: PopoverArrowState = {
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
      arrowRef.value = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        
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

export interface PopoverArrowState {
  /**
   * Whether the popover is currently open.
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

export interface PopoverArrowProps extends BaseUIComponentProps<'div', PopoverArrowState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverArrow {
  export type State = PopoverArrowState;
  export type Props = PopoverArrowProps;
}
