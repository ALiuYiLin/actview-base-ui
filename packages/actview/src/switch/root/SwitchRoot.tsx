import { computed, ref, toRefs, watch } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import { useControlled } from '@/utils/useControlled';
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
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchRoot(componentProps: SwitchRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 refs：switchRef/rootRef 经 params.ref 合并链透传（不用 useRootElement）。
  const switchRef = ref(null as HTMLElement | null);
  const rootRef = ref(null as HTMLElement | null);

  // 初始化型快照（仅 setup 一次性消费——对齐 React 初始化器语义）。
  const defaultChecked = componentProps.defaultChecked;
  const ariaLabelledByProp = componentProps['aria-labelledby'];
  const idProp = componentProps.id;
  const externalInputRef = componentProps.inputRef as any;
  const nameProp = componentProps.name;

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const nativeButton = computed(() => componentProps.nativeButton ?? false);
  const form = computed(() => componentProps.form);
  const uncheckedValue = computed(() => componentProps.uncheckedValue);
  const value = computed(() => componentProps.value);

  // context 载体直取（store-as-is）。
  const {clearErrors} = useFormContext();
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
  } = useFieldRootContext();
  const {labelId} = useLabelableContext();

  // disabled 用 computed：Field.Root 或本组件 disabled 动态变化时渲染期 `.value`
  // 与 useButton 的 watch 都能拿到实时值。
  const disabled = computed(() => fieldDisabled.value || (componentProps.disabled ?? false));
  const name = computed(() => fieldName.value ?? componentProps.name);

  const inputRef = ref(null as HTMLInputElement | null);
  const handleInputRef = useMergedRefs(inputRef, externalInputRef, validation.inputRef);

  const id = useBaseUiId();

  const controlId = useLabelableId({id: idProp});
  const hiddenInputId = computed(() => (nativeButton.value ? undefined : controlId));

  const [checked, setCheckedState] = useControlled({
    // 受控值用 getter：外部 `checked` prop 动态变化时实时生效
    controlled: () => componentProps.checked,
    default: Boolean(defaultChecked),
    name: 'Switch',
    state: 'checked',
  });

  useRegisterFieldControl(switchRef, id, checked.value, undefined, !disabled.value, componentProps.name);

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
    clearErrors(name.value);
    setDirty(Boolean(checked.value) !== Boolean(validityData.value.initialValue));
    setFilled(Boolean(checked.value));

    validation.change(Boolean(checked.value));
  });

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton.value,
  });
  const ariaLabelledBy = useAriaLabelledBy(
    ariaLabelledByProp as string | undefined,
    labelId.value,
    inputRef,
    !nativeButton.value,
    hiddenInputId.value,
  );

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // 组件自定义 props（defaultChecked）剔除——否则泄漏到 DOM。
  const {
    className,
    render,
    style,
    defaultChecked: _defaultChecked,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const checkedValue = computed(() => Boolean(checked.value));
  const readOnly = computed(() => componentProps.readOnly ?? false);
  const required = computed(() => componentProps.required ?? false);

  const stateValue = computed<SwitchRootState>(() => ({
    ...fieldState.value,
    checked: checkedValue.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    required: required.value,
  }));

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值；
  // 回调类 props（onCheckedChange）事件期直读 componentProps。
  const handleRootFocus = () => {
    if (!disabled.value) {
      setFocused(true);
    }
  };

  const handleRootBlur = () => {
    const element = inputRef.value;
    if (!element || disabled.value) {
      return;
    }

    setTouched(true);
    setFocused(false);

    if (validationMode.value === 'onBlur') {
      validation.commit(element.checked);
    }
  };

  const handleRootClick = (event: any) => {
    if (readOnly.value || disabled.value) {
      return;
    }

    event.preventDefault();

    const input = inputRef.value;
    if (!input) {
      return;
    }

    dispatchClickWithModifiers(input, event);
  };

  const handleInputClick = (event: any) => {
    // The click dispatched from the root's `onClick` is an implementation detail
    // and must not reach ancestors, which already receive the original click.
    event.stopPropagation();

    const input = event.currentTarget as HTMLInputElement;

    if (readOnly.value) {
      event.preventDefault();
      return;
    }

    const nextChecked = input.checked;
    const eventDetails = createChangeEventDetails(REASONS.none, event);

    componentProps.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setCheckedState(nextChecked);
  };

  const handleInputFocus = () => {
    switchRef.value?.focus();
  };

  // 根元素 props：role/aria/handlers → 透传 → getButtonProps 链 → validation →
  // state data-*（hook 内 className/style 后置合并）。
  const rootProps = computed(() =>
    mergePropsN<any>([
      {
        id: nativeButton.value ? controlId : id,
        role: 'switch',
        'aria-checked': checkedValue.value,
        'aria-readonly': readOnly.value || undefined,
        'aria-required': required.value || undefined,
        'aria-labelledby': ariaLabelledBy,
        onFocus: handleRootFocus,
        onBlur: handleRootBlur,
        onClick: handleRootClick,
      },
      elementProps.value,
      (prev: any) => getButtonProps(prev),
      (prev: any) => validation.getValidationProps(disabled.value, prev),
      getStateAttributesProps(stateValue.value, stateAttributesMapping),
    ]),
  );

  // hidden input props：validation → checked/disabled → 事件（点击即切换，
  // React 版 onChange 等价——switch 激活由原生 click 表达）。
  const inputProps = computed<Record<string, any>>(() => ({
    ...validation.getValidationProps(disabled.value),
    checked: checkedValue.value,
    disabled: disabled.value,
    form: form.value,
    id: hiddenInputId.value,
    name: name.value,
    required: required.value,
    style: name.value ? visuallyHiddenInput : visuallyHidden,
    tabIndex: -1,
    type: 'checkbox',
    'aria-hidden': true,
    ref: handleInputRef,
    onClick: handleInputClick,
    onFocus: handleInputFocus,
    // React <19 sets an empty value if `undefined` is passed explicitly
    // To avoid this, we only set the value if it's defined
    ...(value.value !== undefined ? {value: value.value} : EMPTY_OBJECT),
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <SwitchRootContext.Provider value={stateValue.value}>
      {useRenderElement(
        'span',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: stateValue.value,
          ref: useMergedRefs(switchRef, buttonRef, rootRef, componentProps.ref),
          props: rootProps.value,
        },
      )}
      {!checkedValue.value && name.value && uncheckedValue.value !== undefined && (
        <input
          type="hidden"
          form={form.value}
          name={name.value}
          value={uncheckedValue.value}
          disabled={disabled.value}
        />
      )}
      <input {...inputProps.value} />
    </SwitchRootContext.Provider>
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
