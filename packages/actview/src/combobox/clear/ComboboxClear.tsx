import { computed, defineComponent } from 'actview';
import { useComboboxInputValueContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useButton } from '../../internals/use-button';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { mergePropsN } from '../../merge-props';

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
export const ComboboxClear = defineComponent(function (componentProps: ComboboxClear.Props) {
  // ================= setup（只执行一次） =================
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
    () => fieldRootContext.value.disabled || comboboxDisabled.value || (componentProps.disabled ?? false),
  );

  const { buttonRef, getButtonProps } = useButton({
    native: computed(() => componentProps.nativeButton ?? true),
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

  const shouldRender = computed(() => (componentProps.keepMounted ?? false) || mounted.value);

  // ================= render（每次更新执行） =================
  return () => {
    if (!shouldRender.value) {
      return null;
    }

    const {
      render,
      className,
      style,
      disabled: _disabled,
      nativeButton: _nativeButton,
      keepMounted: _keepMounted,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
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
}) as (props: ComboboxClear.Props) => any;

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