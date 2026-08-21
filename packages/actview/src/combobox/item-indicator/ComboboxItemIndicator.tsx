import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useComboboxItemContext } from '../item/ComboboxItemContext';
import { useTransitionStatus, type TransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { mergePropsN } from '../../merge-props';

/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxItemIndicator = defineComponent(function (componentProps: ComboboxItemIndicator.Props) {
  // ================= setup（只执行一次） =================
  const { selected } = useComboboxItemContext().value;

  const indicatorRef = { current: null as HTMLSpanElement | null };

  const { transitionStatus, setMounted } = useTransitionStatus(computed(() => selected));

  const state = computed<ComboboxItemIndicatorState>(() => ({
    selected,
    transitionStatus: transitionStatus.value,
  }));

  useOpenChangeComplete({
    open: computed(() => selected),
    ref: indicatorRef,
    onComplete() {
      if (!selected) {
        setMounted(false);
      }
    },
  });

  const rootRef = ref<HTMLSpanElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, indicatorRef, rootRef);

  const shouldRender = computed(() => (componentProps.keepMounted ?? false) || selected);

  // ================= render（每次更新执行） =================
  return () => {
    if (!shouldRender.value) {
      return null;
    }

    const {
      render,
      className,
      style,
      keepMounted: _keepMounted,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, transitionStatusMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-hidden': true,
        children: '✔️',
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
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
    return <span ref={mergedRef} {...merged} />;
  };
}) as (props: ComboboxItemIndicator.Props) => any;

export interface ComboboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  ComboboxItemIndicatorState
> {
  children?: any;
  /**
   * Whether to keep the HTML element in the DOM when the item is not selected.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface ComboboxItemIndicatorState {
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace ComboboxItemIndicator {
  export type Props = ComboboxItemIndicatorProps;
  export type State = ComboboxItemIndicatorState;
}