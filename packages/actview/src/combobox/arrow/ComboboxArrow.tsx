import { computed, defineComponent, ref, watch } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useComboboxPositionerContext } from '@/combobox/positioner/ComboboxPositionerContext';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';

/**
 * Displays an element positioned against the anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxArrow = defineComponent(function (componentProps: ComboboxArrow.Props) {
  // ================= setup（只执行一次） =================
  const store = useComboboxRootContext();
  const positioning = useComboboxPositionerContext();
  const { arrowRef, side, align, arrowUncentered, arrowStyles } = positioning.value;

  const open = store.useState('open');

  const state = computed<ComboboxArrowState>(() => ({
    open: open.value,
    side: side.value,
    align: align.value,
    uncentered: arrowUncentered.value,
  }));

  const rootRef = ref<HTMLElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, rootRef);

  watch(
    rootRef,
    (node) => {
      arrowRef.current = node;
    },
    { flush: 'sync', immediate: true },
  );

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

    const stateAttributes = getStateAttributesProps(stateValue, popupStateMapping);

    const arrowStyle = typeof arrowStyles.value === 'object' ? arrowStyles.value : {};
    const resolvedStyle = typeof style === 'function' ? style(stateValue) : style;
    const styleObj = typeof resolvedStyle === 'object' && resolvedStyle !== null ? resolvedStyle : {};

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        style: {
          ...arrowStyle,
          ...styleObj,
        },
        'aria-hidden': true,
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
}) as (props: ComboboxArrow.Props) => any;

export interface ComboboxArrowState {
  /**
   * Whether the popup is currently open.
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

export interface ComboboxArrowProps extends BaseUIComponentProps<'div', ComboboxArrowState> {}

export namespace ComboboxArrow {
  export type State = ComboboxArrowState;
  export type Props = ComboboxArrowProps;
}