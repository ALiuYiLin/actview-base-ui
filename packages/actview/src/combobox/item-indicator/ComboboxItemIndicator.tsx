import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxItemContext } from '../item/ComboboxItemContext';
import { useTransitionStatus, type TransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';

/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxItemIndicator(componentProps: ComboboxItemIndicator.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    keepMounted = false,
    ...elementProps
  } = componentProps;

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

  const getElement = useRenderElement('span', componentProps, {
    ref: [componentProps.ref, indicatorRef],
    state,
    props: [
      {
        'aria-hidden': true,
        children: '✔️',
      },
      elementProps,
    ],
    stateAttributesMapping: transitionStatusMapping,
  });

  // Setup runs once in ActView, so the conditional render must live in JSX.
  return <>{keepMounted || selected ? getElement() : null}</>;
}

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
