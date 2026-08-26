import { computed, ref, toValue, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { useMergedRefs } from '@/utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@/utils/visuallyHidden';
import { EMPTY_OBJECT } from '@/utils/empty';
import type { BaseUIComponentProps, NonNativeButtonProps, HTMLProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useButton } from '@/internals/use-button/useButton';
import { SwitchRootContext } from './SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { dispatchClickWithModifiers } from '@/utils/dispatchClickWithModifiers';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '@/internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useValueChanged } from '@/internals/useValueChanged';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergePropsN } from '@/merge-props';
import type { Ref } from 'actview';

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchRoot(componentProps: SwitchRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const defaultChecked = toValue(componentProps.defaultChecked);
  const ariaLabelledByProp = toValue(componentProps['aria-labelledby']);
  const form = toValue(componentProps.form);
  const idProp = toValue(componentProps.id);
  const externalInputRef = componentProps.inputRef as any;
  const nameProp = toValue(componentProps.name);
  const nativeButton = toValue(componentProps.nativeButton) ?? false;
  const onCheckedChange = componentProps.onCheckedChange;
  const uncheckedValue = toValue(componentProps.uncheckedValue);
  const value = toValue(componentProps.value);

  const {clearErrors} = toValue(useFormContext());
  const {
    state: fieldState,
    setTouched,
    setDirty,
    validityData,
    setFilled,
    setFocused,
    validationMode,
    disabled: fieldDisabled,
    name: fieldName,
    validation,
  } = toValue(useFieldRootContext());
  const {labelId} = toValue(useLabelableContext());

  // disabled 用 computed：Field.Root 或本组件 disabled 动态变化时渲染期 `.value`
  // 与 useButton 的 watch 都能拿到实时值。
  // getter 直接读 componentProps（响应式）——setup 快照（disabledProp）会停留在首渲染。
  const disabled = computed(() => fieldDisabled.value || (toValue(componentProps.disabled) ?? false));
  const name = fieldName.value ?? nameProp;

  const inputRef = ref(null as HTMLInputElement | null);
  const handleInputRef = useMergedRefs(inputRef, externalInputRef, validation.inputRef);

  const switchRef = ref(null as HTMLElement | null);

  const id = useBaseUiId();

  const controlId = useLabelableId({id: idProp});
  const hiddenInputId = nativeButton ? undefined : controlId;

  const [checked, setCheckedState] = useControlled({
    // 受控值用 getter：外部 `checked` prop 动态变化时实时生效（P1 教训：受控需传 getter）
    controlled: () => toValue(componentProps.checked),
    default: Boolean(defaultChecked),
    name: 'Switch',
    state: 'checked',
  });

  useRegisterFieldControl(switchRef, id, toValue(checked), undefined, !disabled.value, nameProp);

  // React 版 useIsoLayoutEffect：setFilled(inputRef.value.checked)
  watch(
    () => inputRef.value,
    () => {
      if (inputRef.value) {
        setFilled(inputRef.value.checked);
      }
    },
    {flush: 'post', immediate: true},
  );

  useValueChanged(checked, () => {
    clearErrors(name);
    setDirty(Boolean(toValue(checked)) !== Boolean(validityData.value.initialValue));
    setFilled(Boolean(toValue(checked)));

    validation.change(Boolean(toValue(checked)));
  });

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
  });
  const ariaLabelledBy = useAriaLabelledBy(
    ariaLabelledByProp as string | undefined,
    labelId.value,
    inputRef,
    !nativeButton,
    hiddenInputId,
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 渲染期逻辑（rootProps/inputProps/stateValue/merged）在 IIFE 中执行（PD-15）
  return (
    <>
      {(() => {
        const {className, render, style, ...elementProps} = componentProps;

        const checkedValue = Boolean(toValue(checked));
        // 渲染期读 props（响应式）——setup 快照会导致 readOnly/required 动态
        // 变化时 state/aria 属性停留在首渲染。
        const readOnly = toValue(componentProps.readOnly) ?? false;
        const required = toValue(componentProps.required) ?? false;

        const rootProps: Record<string, any> = {
          id: nativeButton ? controlId : id,
          role: 'switch',
          'aria-checked': checkedValue,
          'aria-readonly': readOnly || undefined,
          'aria-required': required || undefined,
          'aria-labelledby': ariaLabelledBy,
          onFocus() {
            if (!disabled.value) {
              setFocused(true);
            }
          },
          onBlur() {
            const element = inputRef.value;
            if (!element || disabled.value) {
              return;
            }

            setTouched(true);
            setFocused(false);

            if (validationMode.value === 'onBlur') {
              validation.commit(element.checked);
            }
          },
          onClick(event: any) {
            if (readOnly || disabled.value) {
              return;
            }

            event.preventDefault();

            const input = inputRef.value;
            if (!input) {
              return;
            }

            dispatchClickWithModifiers(input, event);
          },
        };

        const inputProps: Record<string, any> = {
          ...validation.getValidationProps(disabled.value),
          checked: checkedValue,
          disabled: disabled.value,
          form,
          id: hiddenInputId,
          name,
          required,
          style: name ? visuallyHiddenInput : visuallyHidden,
          tabIndex: -1,
          type: 'checkbox',
          'aria-hidden': true,
          ref: handleInputRef,
          // actview onChange 对 INPUT 监听 'input' 事件（文本语义）——switch 激活由原生 click 表达，
          // 因此 checked 逻辑放 input 的 onClick（React 版 onChange 等价）。
          onClick(event: any) {
            // The click dispatched from the root's `onClick` is an implementation detail
            // and must not reach ancestors, which already receive the original click.
            event.stopPropagation();

            const input = event.currentTarget as HTMLInputElement;

            if (readOnly) {
              event.preventDefault();
              return;
            }

            const nextChecked = input.checked;
            const eventDetails = createChangeEventDetails(REASONS.none, event);

            onCheckedChange?.(nextChecked, eventDetails);

            if (eventDetails.isCanceled) {
              return;
            }

            setCheckedState(nextChecked);
          },
          onFocus() {
            switchRef.value?.focus();
          },
          // React <19 sets an empty value if `undefined` is passed explicitly
          // To avoid this, we only set the value if it's defined
          ...(value !== undefined ? {value} : EMPTY_OBJECT),
        };

        const stateValue: SwitchRootState = {
          ...fieldState.value,
          checked: checkedValue,
          disabled: disabled.value,
          readOnly,
          required,
        };

        const merged: HTMLProps = mergePropsN<any>([
          rootProps,
          elementProps,
          getButtonProps,
          (props: any) => validation.getValidationProps(disabled.value, props),
          getStateAttributesProps(stateValue, stateAttributesMapping),
        ]);
        if (typeof className === 'function') {
          merged.className = className(stateValue);
        } else if (className !== undefined) {
          merged.className = className;
        }
        if (typeof style === 'function') {
          merged.style = style(stateValue);
        } else if (style !== undefined) {
          merged.style = style;
        }

        const mergedRefs = (el: HTMLElement | null) => {
          switchRef.value = el;
          buttonRef(el);
        };

        let element: any;
        if (render) {
          if (typeof render === 'function') {
            element = render({...merged, ...stateValue, ref: mergedRefs} as any);
          } else {
            const renderProps = render.props ?? {};
            const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
            const Tag = render.type as any;
            const mergedRenderProps = Object.assign({}, merged, restRenderProps);
            mergedRenderProps.className =
              typeof merged.className === 'string' && typeof renderClassName === 'string'
                ? `${merged.className} ${renderClassName}`.trim()
                : (merged.className ?? renderClassName);
            mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
            element = <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs} />;
          }
        } else {
          element = <span {...merged} ref={mergedRefs} />;
        }

        return (
          <SwitchRootContext.Provider value={stateValue as any}>
            {element}
            {!checkedValue && name && uncheckedValue !== undefined && (
              <input type="hidden" form={form} name={name} value={uncheckedValue} disabled={disabled.value} />
            )}
            <input {...inputProps} />
          </SwitchRootContext.Provider>
        );
      })()}
    </>
  );
}

export interface SwitchRootState extends FieldRootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchRootProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', SwitchRootState>, 'onChange'> {
  /**
   * The id of the hidden input element.
   *
   * When `nativeButton` is `true`, the id is applied to the root element.
   */
  id?: string | undefined;
  /**
   * Whether the switch is currently active.
   *
   * To render an uncontrolled switch, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: Ref<HTMLInputElement | null> | ((element: HTMLInputElement | null) => void) | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export type SwitchRootChangeEventReason = typeof REASONS.none;
export type SwitchRootChangeEventDetails = BaseUIChangeEventDetails<SwitchRoot.ChangeEventReason>;

export namespace SwitchRoot {
  export type State = SwitchRootState;
  export type Props = SwitchRootProps;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}
