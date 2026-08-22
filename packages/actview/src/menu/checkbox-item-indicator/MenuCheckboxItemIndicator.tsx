import { computed } from 'actview';
import { useMenuCheckboxItemContext } from '@/menu/checkbox-item/MenuCheckboxItemContext';
import { useRenderElement } from '@/internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { itemMapping } from '@/menu/utils/stateAttributesMapping';
import { useTransitionStatus, type TransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { mergeProps } from '@/merge-props';

/**
 * Indicates whether the checkbox item is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuCheckboxItemIndicator(componentProps: MenuCheckboxItemIndicator.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    keepMounted = false,
    ...elementProps
  } = componentProps;

  const itemContext = useMenuCheckboxItemContext();
  const checked = computed(() => itemContext.value.checked);

  const shouldRender = computed(() => keepMounted || checked.value);

  const indicatorRef = { current: null as HTMLSpanElement | null };

  const { transitionStatus, setMounted } = useTransitionStatus(checked);

  const state = computed<MenuCheckboxItemIndicatorState>(() => ({
    checked: checked.value,
    disabled: itemContext.value.disabled,
    highlighted: itemContext.value.highlighted,
    transitionStatus: transitionStatus.value,
  }));

  useOpenChangeComplete({
    open: checked,
    ref: indicatorRef,
    onComplete() {
      if (!checked.value) {
        setMounted(false);
      }
    },
  });

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: [componentProps.ref, indicatorRef],
    stateAttributesMapping: itemMapping,
    props: [
      (prev: any) => mergeProps(prev, { 'aria-hidden': 'true' }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  return <>{shouldRender.value ? getElement() : null}</>;
}

export interface MenuCheckboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  MenuCheckboxItemIndicatorState
> {
  /**
   * Whether to keep the HTML element in the DOM when the checkbox item is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface MenuCheckboxItemIndicatorState {
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace MenuCheckboxItemIndicator {
  export type Props = MenuCheckboxItemIndicatorProps;
  export type State = MenuCheckboxItemIndicatorState;
}
