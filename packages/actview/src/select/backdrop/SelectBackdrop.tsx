import { computed } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import { popupStateMapping } from '@/utils/popupStateMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { selectors } from '@/select/store';

const stateAttributesMapping: StateAttributesMapping<SelectBackdropState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectBackdrop(componentProps: SelectBackdrop.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const { store } = rootContext;

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state = computed<SelectBackdropState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      (prev: any) => ({
        ...prev,
        role: 'presentation',
        hidden: !mounted.value,
        style: {
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
      }),
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface SelectBackdropState {
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface SelectBackdropProps extends BaseUIComponentProps<'div', SelectBackdropState> {}

export namespace SelectBackdrop {
  export type State = SelectBackdropState;
  export type Props = SelectBackdropProps;
}
