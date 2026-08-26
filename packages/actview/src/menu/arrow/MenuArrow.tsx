import { toRefs, unrefs } from 'actview';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 */
export function MenuArrow(componentProps: MenuArrow.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);

  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext();
  const {arrowRef, side, align, arrowUncentered, arrowStyles} = positionerContext.value ?? {
    arrowRef: {value: null as Element | null},
    side: 'bottom' as Side,
    align: 'center' as Align,
    arrowUncentered: false,
    arrowStyles: undefined as any,
  };
  const open = store.useState('open');

  const {element} = useRenderElement({
    props: () => [
      {
        style: arrowStyles?.value ?? arrowStyles,
        'aria-hidden': true,
      },
      unrefs(elementProps),
      popupStateMapping.open(open.value) ?? {},
    ],
    state: (): MenuArrowState => ({
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
        (el: any) => {
          arrowRef.value = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(ref);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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
