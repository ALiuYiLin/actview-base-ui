import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { RadioRootState } from '../root/RadioRoot';
import { useRadioRootContext } from '../root/RadioRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioIndicator(props: RadioIndicator.Props) {
  const rootState = useRadioRootContext();

  const rendered = computed(() => rootState.value.checked);

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  const state = computed<RadioIndicatorState>(() => ({
    ...rootState.value,
    transitionStatus: transitionStatus.value,
  }));

  const indicatorRef = { current: null as HTMLSpanElement | null };

  const shouldRender = computed(() => (props.keepMounted ?? false) || mounted.value);

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      keepMounted: _keepMounted,
      ref: _ref,
      ...elementProps
    } = props;
    return elementProps;
  };

  const getElement = useRenderElement('span', props, {
    ref: [props.ref, indicatorRef],
    state,
    props: getElementProps,
    stateAttributesMapping,
  });

  useOpenChangeComplete({
    open: rendered,
    ref: indicatorRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  return shouldRender.value ? getElement() : null;
}

export interface RadioIndicatorProps extends BaseUIComponentProps<'span', RadioIndicatorState> {
  /**
   * Whether to keep the HTML element in the DOM when the radio button is inactive.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface RadioIndicatorState extends RadioRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorProps;
  export type State = RadioIndicatorState;
}
