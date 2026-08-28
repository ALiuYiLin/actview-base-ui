import { toRefs, unrefs } from 'actview';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Displays an element positioned against the popover anchor.
 * Renders a `<div>` element.
 */
export function PopoverArrow(componentProps: PopoverArrow.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
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
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const attributes: Record<string, string> = {};
      const mapping: any = popupStateMapping;
      const openAttr = mapping.open(open.value);
      if (openAttr) {
        Object.assign(attributes, openAttr);
      }
      return [
        {
          style: arrowStyles?.value ?? arrowStyles,
          'aria-hidden': true,
        },
        unrefs(elementProps),
        attributes,
      ];
    },
    state: () => ({
      open: open.value,
      side,
      align,
      uncentered: arrowUncentered,
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLDivElement | null) => {
          arrowRef.value = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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
