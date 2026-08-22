import { computed } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSelectItemContext } from '@/select/item/SelectItemContext';
import { useTransitionStatus, type TransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useRenderElement } from '@/internals/useRenderElement';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';

/**
 * Indicates whether the select item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItemIndicator(componentProps: SelectItemIndicator.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    keepMounted = false,
    ...elementProps
  } = componentProps;

  const itemContext = useSelectItemContext();
  const selected = computed(() => itemContext.value.selected);

  const shouldRender = computed(() => keepMounted || selected.value);

  const indicatorRef = { current: null as HTMLSpanElement | null };

  const { transitionStatus, setMounted } = useTransitionStatus(selected);

  const state = computed<SelectItemIndicatorState>(() => ({
    selected: selected.value,
    transitionStatus: transitionStatus.value,
  }));

  const getElement = useRenderElement('span', componentProps, {
    ref: [componentProps.ref, indicatorRef],
    state,
    props: [
      (prev: any) => ({ ...prev, 'aria-hidden': true, children: '✔️' }),
      elementProps,
    ],
    stateAttributesMapping: transitionStatusMapping,
  });

  useOpenChangeComplete({
    open: selected,
    ref: indicatorRef,
    onComplete() {
      if (!selected.value) {
        setMounted(false);
      }
    },
  });

  return <>{shouldRender.value ? getElement() : null}</>;
}

export interface SelectItemIndicatorState {
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface SelectItemIndicatorProps extends BaseUIComponentProps<
  'span',
  SelectItemIndicatorState
> {
  children?: any;
  /**
   * Whether to keep the HTML element in the DOM when the item is not selected.
   */
  keepMounted?: boolean | undefined;
}

export namespace SelectItemIndicator {
  export type State = SelectItemIndicatorState;
  export type Props = SelectItemIndicatorProps;
}
