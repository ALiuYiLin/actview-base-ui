import { computed } from 'actview';
import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';
import { REASONS } from '@/internals/reasons';

/**
 * An overlay displayed beneath the popover.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverBackdrop(componentProps: PopoverBackdrop.Props) {
  const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;

  const store = usePopoverRootContext().value!;

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const openReason = store.useState('openChangeReason');

  const state = computed<PopoverBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  const element = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      () => ({
        role: 'presentation',
        hidden: !mounted.value,
        style: {
          ...(openReason.value === REASONS.triggerHover ? { pointerEvents: 'none' } : null),
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
      }),
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });

  return <>{element()}</>;
}

export interface PopoverBackdropState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PopoverBackdropProps extends BaseUIComponentProps<'div', PopoverBackdropState> {}

export namespace PopoverBackdrop {
  export type State = PopoverBackdropState;
  export type Props = PopoverBackdropProps;
}
