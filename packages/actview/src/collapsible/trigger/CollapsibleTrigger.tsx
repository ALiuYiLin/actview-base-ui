import { computed } from 'actview';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { type CollapsibleRootState } from '../root/CollapsibleRoot';

const stateAttributesMapping: StateAttributesMapping<CollapsibleRootState> = {
  ...triggerOpenStateMapping,
  ...transitionStatusMapping,
};

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleTrigger(componentProps: CollapsibleTrigger.Props) {
  const context = useCollapsibleRootContext();

  const disabled = computed(() => componentProps.disabled ?? context.value.disabled);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  const getElementProps = () => {
    const {
      className: _className,
      disabled: _disabled,
      render: _render,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const state = computed(() => context.value.state);

  const getElement = useRenderElement('button', componentProps, {
    state,
    ref: [componentProps.ref, buttonRef],
    props: [
      () => ({
        'aria-controls': context.value.open ? context.value.panelId : undefined,
        'aria-expanded': context.value.open,
        onClick: context.value.handleTrigger,
      }),
      getElementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}
