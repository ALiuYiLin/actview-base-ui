import { computed, defineComponent, useRootElement } from 'actview';
import { useCheckboxRootContext } from '../root/CheckboxRootContext';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import type { CheckboxRootState } from '../root/CheckboxRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { mergePropsN } from '../../merge-props';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export const CheckboxIndicator = defineComponent(function (componentProps: CheckboxIndicator.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const rootState = useCheckboxRootContext();

  const rendered = computed(() => rootState.value.checked || rootState.value.indeterminate);

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  useOpenChangeComplete({
    open: rendered,
    ref: rootRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  const state = computed(
    () =>
      ({
        ...rootState.value,
        transitionStatus: transitionStatus.value,
      }) as CheckboxIndicatorState,
  );

  const baseStateAttributesMapping = getCheckboxStateAttributesMapping(rootState);

  const stateAttributesMapping: StateAttributesMapping<CheckboxIndicatorState> = {
    ...baseStateAttributesMapping,
    ...transitionStatusMapping,
  };

  // ================= render（每次更新执行） =================
  return () => {
    const keepMounted = componentProps.keepMounted ?? false;
    if (!keepMounted && !mounted.value) {
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

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
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
    return <span ref={rootRef} {...merged} />;
  };
}) as (props: CheckboxIndicator.Props) => any;

export interface CheckboxIndicatorState extends CheckboxRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CheckboxIndicatorProps extends BaseUIComponentProps<
  'span',
  CheckboxIndicatorState
> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CheckboxIndicator {
  export type State = CheckboxIndicatorState;
  export type Props = CheckboxIndicatorProps;
}