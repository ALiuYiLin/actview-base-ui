import { computed, defineComponent, watch } from 'actview';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { mergePropsN } from '../../merge-props';

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionTrigger = defineComponent(function (componentProps: AccordionTrigger.Props) {
  // ================= setup（只执行一次） =================
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

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      disabled: _disabled,
      id: _idProp,
      nativeButton: _nativeButton,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, triggerOpenStateMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-controls': collapsibleContext.value.open
          ? collapsibleContext.value.panelId
          : undefined,
        'aria-expanded': collapsibleContext.value.open ? 'true' : 'false',
        id: id.value,
        onClick: collapsibleContext.value.handleTrigger,
      },
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
      (p: HTMLProps) => getButtonProps(p),
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: buttonRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={buttonRef} />;
    }
    return <button ref={buttonRef} {...merged} />;
  };
}) as (props: AccordionTrigger.Props) => any;

export interface AccordionTriggerState extends AccordionItemState {}

export interface AccordionTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', AccordionTriggerState> {}

export namespace AccordionTrigger {
  export type State = AccordionTriggerState;
  export type Props = AccordionTriggerProps;
}