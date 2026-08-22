import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuArrow = defineComponent(function (componentProps: MenuArrow.Props) {
  // ================= setup（只执行一次） =================
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

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(positionerContext.value.arrowRef, componentProps.ref, rootRef);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;
    const arrowStyles = positionerContext.value.arrowStyles.value;

    const stateAttributes = getStateAttributesProps(stateValue, popupStateMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-hidden': 'true',
        style: typeof arrowStyles === 'object' ? { ...arrowStyles } : arrowStyles,
        className: typeof className === 'function' ? className(stateValue) : className,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: mergedRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
    }
    return <div ref={mergedRef} {...merged} />;
  };
}) as (props: MenuArrow.Props) => any;

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