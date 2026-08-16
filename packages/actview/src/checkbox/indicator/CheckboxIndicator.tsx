import { computed } from 'actview';
import { useCheckboxRootContext } from '../root/CheckboxRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import type { CheckboxRootState } from '../root/CheckboxRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxIndicator(componentProps: CheckboxIndicator.Props) {
  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      keepMounted: _keepMounted,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const rootState = useCheckboxRootContext();

  const rendered = computed(() => rootState.value.checked || rootState.value.indeterminate);

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  const indicatorRef = { current: null as HTMLSpanElement | null };

  const state = computed(
    () =>
      ({
        ...rootState.value,
        transitionStatus: transitionStatus.value,
      }) as CheckboxIndicatorState,
  );

  useOpenChangeComplete({
    open: rendered,
    ref: indicatorRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  const baseStateAttributesMapping = getCheckboxStateAttributesMapping(rootState);

  const stateAttributesMapping: StateAttributesMapping<CheckboxIndicatorState> = {
    ...baseStateAttributesMapping,
    ...transitionStatusMapping,
  };

  const getElement = useRenderElement('span', componentProps, {
    ref: [componentProps.ref, indicatorRef],
    state,
    stateAttributesMapping,
    props: [getElementProps],
  });

  return (componentProps.keepMounted || mounted.value) ? getElement() : null;
}

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
