import { computed } from 'actview';
import { useComboboxInputValueContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';

const stateAttributesMapping: StateAttributesMapping<ComboboxClearState> = {
  ...transitionStatusMapping,
  ...triggerOpenStateMapping,
};

/**
 * Clears the value when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxClear(componentProps: ComboboxClear.Props) {
  const {
    render: _render,
    className: _className,
    disabled: disabledProp = false,
    nativeButton = true,
    keepMounted = false,
    style: _style,
    ...elementProps
  } = componentProps;

  const fieldRootContext = useFieldRootContext();
  const store = useComboboxRootContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const hasSelectionChips = store.useState('hasSelectionChips');

  const inputValue = useComboboxInputValueContext();

  const visible = computed(() => {
    if (selectionMode.value === 'none') {
      return inputValue.value !== '';
    } else if (selectionMode.value === 'single') {
      return selectedValue.value != null;
    }
    return hasSelectionChips.value;
  });

  const disabled = computed(
    () => fieldRootContext.value.disabled || comboboxDisabled.value || disabledProp,
  );

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled,
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(visible);

  const state = computed<ComboboxClearState>(() => ({
    disabled: disabled.value,
    visible: visible.value,
    open: open.value,
    transitionStatus: transitionStatus.value,
  }));

  useOpenChangeComplete({
    open: visible,
    ref: store.state.clearRef,
    onComplete() {
      if (!visible.value) {
        setMounted(false);
      }
    },
  });

  const getElement = useRenderElement('button', componentProps, {
    state,
    ref: [componentProps.ref, buttonRef, store.state.clearRef],
    props: [
      {
        tabIndex: -1,
        children: 'x',
        // Avoid stealing focus from the input.
        onMouseDown(event: MouseEvent) {
          event.preventDefault();
        },
        onClick(event: MouseEvent) {
          if (disabled.value || readOnly.value) {
            return;
          }

          const type = store.state.keyboardActiveRef.current ? REASONS.keyboard : REASONS.pointer;

          store.state.setInputValue(
            '',
            createChangeEventDetails(REASONS.clearPress, event),
          );

          if (selectionMode.value !== 'none') {
            store.state.setSelectedValue(
              Array.isArray(selectedValue.value) ? [] : null,
              createChangeEventDetails(REASONS.clearPress, event),
            );
            // A distinct object shape: `Store.update` iterates own keys, so passing an explicit
            // `selectedIndex: undefined` would overwrite the state instead of leaving it alone.
            store.state.setIndices({ activeIndex: null, selectedIndex: null, type });
          } else {
            store.state.setIndices({ activeIndex: null, type });
          }

          store.state.inputRef.current?.focus();
        },
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  const shouldRender = computed(() => keepMounted || mounted.value);

  // Setup runs once in ActView, so the conditional render must live in JSX.
  return <>{shouldRender.value ? getElement() : null}</>;
}

export interface ComboboxClearState {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the clear button should be visible.
   */
  visible: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: any;
}

export interface ComboboxClearProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxClearState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component should remain mounted in the DOM when not visible.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace ComboboxClear {
  export type State = ComboboxClearState;
  export type Props = ComboboxClearProps;
}
