import { computed } from 'actview';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { mergeProps } from '../../merge-props';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuArrow(componentProps: MenuArrow.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const positionerContext = useMenuPositionerContext();
  const open = store.useState('open');

  const state = computed<MenuArrowState>(() => ({
    open: open.value,
    side: positionerContext.value.side.value,
    align: positionerContext.value.align.value,
    uncentered: positionerContext.value.arrowUncentered.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: [positionerContext.value.arrowRef, componentProps.ref],
    stateAttributesMapping: popupStateMapping,
    state,
    props: [
      (prev: any) =>
        mergeProps(prev, {
          style: positionerContext.value.arrowStyles.value,
          'aria-hidden': 'true',
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  return <>{getElement()}</>;
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
