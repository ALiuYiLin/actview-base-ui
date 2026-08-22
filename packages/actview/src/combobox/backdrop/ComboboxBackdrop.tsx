import { computed, defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { popupStateMapping } from '@/utils/popupStateMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { mergePropsN } from '@/merge-props';

const stateAttributesMapping: StateAttributesMapping<ComboboxBackdropState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxBackdrop = defineComponent(function (componentProps: ComboboxBackdrop.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const store = useComboboxRootContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state = computed<ComboboxBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

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

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const resolvedStyle = typeof style === 'function' ? style(stateValue) : style;
    const styleObj = typeof resolvedStyle === 'object' && resolvedStyle !== null ? resolvedStyle : {};

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        role: 'presentation',
        hidden: !mounted.value,
        style: {
          userSelect: 'none',
          WebkitUserSelect: 'none',
          ...styleObj,
        },
        className: typeof className === 'function' ? className(stateValue) : className,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
}) as (props: ComboboxBackdrop.Props) => any;

export interface ComboboxBackdropProps extends BaseUIComponentProps<'div', ComboboxBackdropState> {}

export interface ComboboxBackdropState {
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace ComboboxBackdrop {
  export type Props = ComboboxBackdropProps;
  export type State = ComboboxBackdropState;
}