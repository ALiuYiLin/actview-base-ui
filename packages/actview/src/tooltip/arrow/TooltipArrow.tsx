import { toRefs, unrefs } from 'actview';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Displays an element positioned against the tooltip anchor.
 * Renders a `<div>` element.
 */
export function TooltipArrow(componentProps: TooltipArrow.Props) {
  const store = useTooltipRootContext(false);
  const positionerContext = useTooltipPositionerContext();
  const {arrowRef, side, align, arrowUncentered, arrowStyles} = positionerContext ?? {
    arrowRef: {value: null as Element | null},
    side: 'bottom' as Side,
    align: 'center' as Align,
    arrowUncentered: false,
    arrowStyles: undefined as any,
  };
  const open = store.useState('open');

  const state = (): TooltipArrowState => ({
    open: open.value,
    side,
    align,
    uncentered: arrowUncentered,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ref: refProp, ...elementProps} = toRefs(
    componentProps,
  );

  const {element} = useRenderElement({
    props: () => {
      const attributes: Record<string, string> = {};
      const mapping: any = popupStateMapping;
      const openAttr = mapping.open(open.value);
      if (openAttr) {
        Object.assign(attributes, openAttr);
      }

      const merged: any = {
        style: arrowStyles?.value ?? arrowStyles,
        'aria-hidden': true,
        ...unrefs(elementProps),
        ...attributes,
      };
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => [arrowRef as any, refProp as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface TooltipArrowState {
  /**
   * Whether the tooltip is currently open.
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

export interface TooltipArrowProps extends BaseUIComponentProps<'div', TooltipArrowState> {
  children?: any;
  [key: string]: any;
}

export namespace TooltipArrow {
  export type State = TooltipArrowState;
  export type Props = TooltipArrowProps;
}
