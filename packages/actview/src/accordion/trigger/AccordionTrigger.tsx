import { computed, watch } from 'actview';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionTrigger(componentProps: AccordionTrigger.Props) {
  const collapsibleContext = useCollapsibleRootContext();
  const itemContext = useAccordionItemContext();

  const disabled = computed(
    () => (componentProps.disabled ?? false) || collapsibleContext.value.disabled,
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: computed(() => componentProps.nativeButton ?? true),
  });

  const state = computed<AccordionTriggerState>(() => itemContext.value.state);

  const registeredId = computed(() => componentProps.id || undefined);
  const id = computed(() => registeredId.value ?? itemContext.value.defaultTriggerId);

  watch(
    registeredId,
    (regId, _old, onCleanup) => {
      const setTriggerId = itemContext.value.setTriggerId;
      setTriggerId((currentId) => regId ?? (currentId === null ? undefined : currentId));
      onCleanup(() => {
        setTriggerId((currentId) => (currentId === regId ? null : currentId));
      });
    },
    { immediate: true },
  );

  function getElementProps(prev: HTMLProps): HTMLProps {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      id: _idProp,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  }

  const getElement = useRenderElement('button', componentProps, {
    state,
    ref: [componentProps.ref, buttonRef],
    props: [
      // Getter (not a static object): props must be re-evaluated on every render,
      // otherwise `open`/`panelId` are frozen at setup time (plantform-diff.md AD-17).
      () => ({
        'aria-controls': collapsibleContext.value.open
          ? collapsibleContext.value.panelId
          : undefined,
        // PD-01: ActView renders boolean-true attributes as empty strings; ARIA booleans
        // are normalized to "true"/"false" like React does.
        'aria-expanded': collapsibleContext.value.open ? 'true' : 'false',
        id: id.value,
        onClick: collapsibleContext.value.handleTrigger,
      }),
      getElementProps,
      getButtonProps,
    ],
    stateAttributesMapping: triggerOpenStateMapping,
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export interface AccordionTriggerState extends AccordionItemState {}

export interface AccordionTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', AccordionTriggerState> {}

export namespace AccordionTrigger {
  export type State = AccordionTriggerState;
  export type Props = AccordionTriggerProps;
}
