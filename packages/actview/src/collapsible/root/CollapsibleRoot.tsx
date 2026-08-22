import { computed } from 'actview';
import { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useCollapsibleRoot } from '@/collapsible/root/useCollapsibleRoot';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from '@/collapsible/root/stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props) {
  const onOpenChange = (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => {
    componentProps.onOpenChange?.(open, eventDetails);
  };

  const collapsible = useCollapsibleRoot({
    open: () => componentProps.open,
    defaultOpen: componentProps.defaultOpen,
    onOpenChange,
    disabled: () => componentProps.disabled ?? false,
  });

  const state = computed<CollapsibleRootState>(() => ({
    open: collapsible.open.value,
    disabled: collapsible.disabled.value,
    transitionStatus: collapsible.transitionStatus.value,
  }));

  const contextValue = computed<CollapsibleRootContext>(() => ({
    defaultPanelId: collapsible.defaultPanelId,
    disabled: collapsible.disabled.value,
    handleTrigger: collapsible.handleTrigger,
    mounted: collapsible.mounted.value,
    open: collapsible.open.value,
    panelId: collapsible.panelId.value,
    setMounted: collapsible.setMounted,
    setOpen: collapsible.setOpen,
    setPanelIdState: collapsible.setPanelIdState,
    transitionStatus: collapsible.transitionStatus.value,
    onOpenChange,
    state: state.value,
  }));

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      defaultOpen: _defaultOpen,
      disabled: _disabled,
      onOpenChange: _onOpenChange,
      open: _open,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: getElementProps,
    stateAttributesMapping: collapsibleStateAttributesMapping,
  });

  return (
    <CollapsibleRootContext.Provider value={contextValue}>
      {getElement()}
    </CollapsibleRootContext.Provider>
  );
}

export interface CollapsibleRootState {
  /**
   * Whether the collapsible panel is currently open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CollapsibleRootProps extends BaseUIComponentProps<'div', CollapsibleRootState> {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: boolean | undefined;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: CollapsibleRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CollapsibleRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;
export type CollapsibleRootChangeEventDetails =
  BaseUIChangeEventDetails<CollapsibleRootChangeEventReason>;

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type Props = CollapsibleRootProps;
  export type ChangeEventReason = CollapsibleRootChangeEventReason;
  export type ChangeEventDetails = CollapsibleRootChangeEventDetails;
}
