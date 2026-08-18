import { computed, watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useRenderElement } from '../../internals/useRenderElement';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { selectors } from '../store';
import { isMouseWithinBounds } from '../../utils/getPseudoElementBounds';
import { contains, getFloatingFocusElement } from '../../floating-ui-actview/utils';
import { mergeProps } from '../../merge-props';
import { useButton } from '../../internals/use-button';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { resolveAriaLabelledBy } from '../../utils/resolveAriaLabelledBy';
import type { Side } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';

const SELECTED_DELAY = 400;

const stateAttributesMapping: StateAttributesMapping<SelectTriggerState> = {
  ...pressableTriggerOpenStateMapping,
  ...fieldValidityMapping,
  popupSide: (side: Side | null) => (side ? { 'data-popup-side': side } : null),
  value: () => null,
};

/**
 * A button that opens the select popup.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectTrigger(componentProps: SelectTrigger.Props) {
  const {
    render: _render,
    className: _className,
    id: idProp,
    disabled: disabledProp = false,
    nativeButton = true,
    style: _style,
    ...elementProps
  } = componentProps;

  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const rootContext = useSelectRootContext().value!;
  const {
    store,
    setOpen,
    selectionRef,
    validation,
    readOnly,
    required,
    alignItemWithTriggerActiveRef,
    disabled: selectDisabled,
  } = rootContext;

  const disabled = computed(
    () => fieldRootContext.value.disabled || selectDisabled || disabledProp,
  );

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const value = store.useState('value');
  const triggerProps = store.useState('triggerProps');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const popupSideValue = store.useState('popupSide');
  const rootId = store.useState('id');
  const selectLabelId = store.useState('labelId');
  const hasSelectedValue = store.useState('hasSelectedValue');
  const popupSide = computed(() =>
    mounted.value && positionerElement.value ? popupSideValue.value : null,
  );

  const id = computed(() => idProp ?? rootId.value);
  const ariaLabelledBy = computed(() =>
    resolveAriaLabelledBy(labelableContext.value.labelId, selectLabelId.value),
  );

  useLabelableId({ id: computed(() => idProp) });

  const positionerRef = useValueAsRef(positionerElement);

  const triggerRef = { current: null as HTMLElement | null };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const setTriggerElement = store.useStateSetter('triggerElement');

  const timeoutFocus = useTimeout();
  const timeoutMouseDown = useTimeout();
  const selectedDelayTimeout = useTimeout();

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        // A mousedown on the trigger can open the popup under the cursor. Keep mouseup selection
        // disabled briefly so releasing over either the selected item or a neighboring item doesn't
        // commit an accidental selection. SelectItem can still opt into unselected mouseup sooner
        // after a real drag over the item.
        selectedDelayTimeout.start(SELECTED_DELAY, () => {
          selectionRef.current.allowUnselectedMouseUp = true;
          selectionRef.current.allowSelectedMouseUp = true;
        });

        return () => {
          selectedDelayTimeout.clear();
        };
      }

      selectionRef.current = {
        allowSelectedMouseUp: false,
        allowUnselectedMouseUp: false,
        dragY: 0,
      };

      timeoutMouseDown.clear();

      return undefined;
    },
    { immediate: true },
  );

  // `triggerProps` and the derived ARIA attributes read store state, so they must be
  // evaluated on every render via getters (setup would snapshot them).
  const getDefaultProps = (): HTMLProps => ({
    id: id.value,
    role: 'combobox',
    'aria-expanded': open.value ? 'true' : 'false',
    'aria-haspopup': 'listbox',
    'aria-controls': open.value
      ? (listElement.value?.id ?? getFloatingFocusElement(positionerElement.value)?.id)
      : undefined,
    'aria-labelledby': ariaLabelledBy.value,
    'aria-readonly': readOnly || undefined,
    'aria-required': required || undefined,
    tabIndex: disabled.value ? -1 : 0,
    onFocus(event: FocusEvent) {
      fieldRootContext.value.setFocused(true);

      // The popup element shouldn't obscure the focused trigger.
      if (open.value && alignItemWithTriggerActiveRef.current) {
        setOpen(false, createChangeEventDetails(REASONS.none, event));
      }

      // Saves a re-render on initial click: `forceMount === true` mounts
      // the items before `open === true`. We could sync those cycles better
      // without a timeout, but this is enough for now.
      timeoutFocus.start(0, () => {
        store.set('forceMount', true);
      });
    },
    onBlur(event: FocusEvent) {
      // If focus is moving into the popup, don't count it as a blur.
      if (contains(positionerElement.value, event.relatedTarget as Element | null)) {
        return;
      }

      fieldRootContext.value.setTouched(true);
      fieldRootContext.value.setFocused(false);

      if (fieldRootContext.value.validationMode === 'onBlur') {
        fieldRootContext.value.validation.commit(value.value);
      }
    },
    onMouseDown(event: MouseEvent) {
      if (open.value) {
        return;
      }

      const doc = ownerDocument(event.currentTarget as Element);

      function handleMouseUp(mouseEvent: MouseEvent) {
        if (!triggerRef.current) {
          return;
        }

        const mouseUpTarget = mouseEvent.target as Element | null;

        // Don't treat the release as an outside press when it lands on the trigger or inside
        // the popup positioner (or their children).
        if (
          contains(triggerRef.current, mouseUpTarget) ||
          contains(positionerRef.current, mouseUpTarget)
        ) {
          return;
        }

        if (isMouseWithinBounds(mouseEvent, triggerRef.current)) {
          return;
        }

        setOpen(false, createChangeEventDetails(REASONS.cancelOpen, mouseEvent));
      }

      // Firefox can fire this upon mousedown
      timeoutMouseDown.start(0, () => {
        doc.addEventListener('mouseup', handleMouseUp, { once: true });
      });
    },
  });

  // Getters must chain event handlers via `mergeProps`, otherwise the spread would overwrite
  // handlers from earlier props (AD-20/AD-27).
  const getMergedProps = (_prev: any): HTMLProps => {
    const merged: HTMLProps = mergeProps<'button'>(
      triggerProps.value,
      getDefaultProps(),
      elementProps,
      getButtonProps,
    );
    const props = validation.getValidationProps(disabled.value, merged);

    // ensure nested useButton does not overwrite the combobox role:
    // <Toolbar.Button render={<Select.Trigger />} />
    props.role = 'combobox';
    return props;
  };

  const state = computed<SelectTriggerState>(() => ({
    ...fieldRootContext.value.state,
    open: open.value,
    disabled: disabled.value,
    value: value.value,
    readOnly,
    popupSide: popupSide.value,
    placeholder: !hasSelectedValue.value,
  }));

  const getElement = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, triggerRef, buttonRef, setTriggerElement],
    state,
    stateAttributesMapping,
    props: [getMergedProps],
  });

  return <>{getElement()}</>;
}

export interface SelectTriggerState extends FieldRootState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
  /**
   * Whether the select popup is readonly.
   */
  readOnly: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the select doesn't have a value.
   */
  placeholder: boolean;
}

export interface SelectTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', SelectTriggerState> {
  children?: VNodeChild;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
}

export namespace SelectTrigger {
  export type State = SelectTriggerState;
  export type Props = SelectTriggerProps;
}
