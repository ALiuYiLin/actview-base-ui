import { computed, onUnmounted, ref, toRefs, watch } from 'actview';
import { EMPTY_OBJECT } from '@/internals/empty';
import { useControlled } from '@/utils/useControlled';
import { visuallyHidden, visuallyHiddenInput } from '@/utils/visuallyHidden';
import { ownerWindow } from '@/utils/owner';
import { getDefaultFormSubmitter } from '@/utils/getDefaultFormSubmitter';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import { dispatchClickWithModifiers } from '@/utils/dispatchClickWithModifiers';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';
import { useButton } from '@/internals/use-button/useButton';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFieldItemContext } from '@/field/item/FieldItemContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '@/internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { useCheckboxGroupContext } from '@/checkbox-group/CheckboxGroupContext';
import { CheckboxRootContext } from './CheckboxRootContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useValueChanged } from '@/internals/useValueChanged';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

export const PARENT_CHECKBOX = 'data-parent';

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxRoot(componentProps: CheckboxRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传到渲染元素（不用 useRootElement）。
  const rootRef = ref<HTMLElement | null>(null);

  // context 载体直取（store-as-is）：字段为 ComputedRef 的渲染期 .value 读取
  // 保持追踪；不再走 toValue/.value 解包链。
  const {clearErrors} = useFormContext();
  const {
    disabled: rootDisabled,
    name: fieldName,
    setDirty,
    setFilled,
    setFocused,
    setTouched,
    state: fieldState,
    validationMode,
    validityData,
    validation: localValidation,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const {labelId, registerControlId, getDescriptionProps} = useLabelableContext();

  const groupContext = useCheckboxGroupContext();
  const parentContext = computed(() =>
    groupContext?.allValues !== undefined ? groupContext.parent : undefined,
  );
  const isGroupedWithParent = computed(() => parentContext.value !== undefined);

  // 初始化型快照（仅 setup 一次性消费——对齐 React 初始化器语义）。
  const defaultChecked = componentProps.defaultChecked ?? false;
  const idProp = componentProps.id;
  const ariaLabelledByProp = componentProps['aria-labelledby'];

  // 渲染期/事件期消费的 props：一律 computed 直读（setup 快照会停留在首渲染）。
  const name = computed(() => fieldName.value ?? componentProps.name);
  const value = computed(() => componentProps.value ?? name.value);
  const parent = computed(() => componentProps.parent ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? false);

  const disabled = computed(
    () =>
      rootDisabled.value ||
      fieldItemContext.disabled.value ||
      (groupContext?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );

  const id = useBaseUiId();

  // A `CheckboxGroup` is the field's control and takes its name from `aria-labelledby`, so the
  // checkboxes sharing its labelable scope must not claim the field's control id: they would all
  // render that one id and collide. A `Field.Item` opens a scope the checkbox does own.
  const ownsControlId = groupContext?.registerControlId !== registerControlId;

  // `|| undefined` rather than `??`: an empty `id` falls back to the scope's control id.
  const controlId = useLabelableId({id: (idProp as string) || undefined, enabled: ownsControlId});

  const rootId = computed(() => (nativeButton.value ? controlId : id));

  // computed：group 的 value 变化时重算（setup 快照会导致 checked 的
  // controlled getter 永远读到初始值——渲染期语义）。
  const groupValue = computed(() => (groupContext ? groupContext.value : undefined));

  const controlRef = ref(null as HTMLElement | null);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton.value,
  });

  const validation = groupContext?.validation ?? localValidation;

  const [checked, setCheckedState] = useControlled<boolean>({
    controlled: () =>
      value.value !== undefined && groupValue.value !== undefined && !parent.value
        ? groupValue.value.includes(value.value)
        : componentProps.checked,
    default: defaultChecked,
    name: 'Checkbox',
    state: 'checked',
  });

  useRegisterFieldControl(
    controlRef as any,
    id,
    checked.value,
    undefined,
    !groupContext && !disabled.value,
    componentProps.name,
  );

  const registerChildId = parentContext.value?.registerChildId;

  const inputRef = ref(null as HTMLInputElement | null);
  const registerFieldInput = validation.registerInput;
  const registerInput = (element: HTMLInputElement) =>
    registerFieldInput(element, {
      controlRef,
      value: groupContext ? value.value : undefined,
    });
  // ref 形 props 直读本體（inputRef 的值本身就是 ref 对象——勿经 toRefs/toValue 解包）
  const mergedInputRef = useMergedRefs(
    componentProps.inputRef as any,
    inputRef as any,
    parent.value ? undefined : (registerInput as any),
  );
  const ariaLabelledBy = useAriaLabelledBy(
    ariaLabelledByProp as string | undefined,
    labelId.value,
    inputRef,
    !nativeButton.value,
    controlId,
  );

  // React 版 useIsoLayoutEffect：input indeterminate 同步 + filled
  watch(
    () => [checked.value, componentProps.indeterminate ?? false] as const,
    () => {
      if (inputRef.value) {
        inputRef.value.indeterminate = Boolean(componentProps.indeterminate ?? false);
        if (checked.value) {
          setFilled(true);
        }
      }
    },
    {flush: 'post', immediate: true},
  );

  useValueChanged(() => checked.value, () => {
    if (groupContext) {
      return;
    }

    clearErrors(name.value);
    setFilled(Boolean(checked.value));
    setDirty(Boolean(checked.value) !== validityData.value.initialValue);

    validation.change(Boolean(checked.value));
  });

  // parentContext disabled 状态注册
  watch(
    () => [parentContext.value, disabled.value, value.value] as const,
    ([currentParent, currentDisabled, currentValue]) => {
      if (!currentParent || currentValue === undefined) {
        return;
      }

      const disabledStates = currentParent.disabledStatesRef.value;
      disabledStates.set(currentValue, currentDisabled);

      return () => {
        disabledStates.delete(currentValue);
      };
    },
    {immediate: true},
  );
  onUnmounted(() => {
    if (parentContext.value && value.value !== undefined) {
      parentContext.value.disabledStatesRef.value.delete(value.value);
    }
  });

  // React 版 useIsoLayoutEffect：子 checkbox 注册 id
  watch(
    () => [parentContext.value, parent.value, value.value, rootId.value] as const,
    ([currentParent, currentParentFlag, currentValue, currentRootId]) => {
      const childRegister = currentParent?.registerChildId;
      if (!childRegister || currentParentFlag || currentValue === undefined || currentRootId === undefined) {
        return;
      }

      const unregister = childRegister(currentValue, currentRootId);
      return unregister;
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    const currentValue = value.value;
    const currentRootId = rootId.value;
    const childRegister = registerChildId;
    if (childRegister && !parent.value && currentValue !== undefined && currentRootId !== undefined) {
      childRegister(currentValue, currentRootId)();
    }
  });

  // ---- 渲染期求值：setup 级 computed（.value 读取发生在 JSX 内 → 归渲染
  //      effect；依赖未变走缓存，引用稳定）----

  // group props：parent/group 上下文方法每次求值（对齐 React 版每次 render 调用）
  const groupProps = computed<any>(() => {
    if (!isGroupedWithParent.value) {
      return {};
    }
    if (parent.value) {
      return parentContext.value!.getParentProps() as any;
    }
    if (value.value !== undefined) {
      return parentContext.value!.getChildProps(value.value) as any;
    }
    return {};
  });

  const stateValue = computed<CheckboxRootState>(() => {
    const currentGroupProps = groupProps.value;
    const checkedPropValue = componentProps.checked ?? false;
    const indeterminatePropValue = componentProps.indeterminate ?? false;
    const readOnlyValue = componentProps.readOnly ?? false;
    const requiredValue = componentProps.required ?? false;

    const groupChecked = currentGroupProps.checked ?? checkedPropValue ?? false;
    const groupIndeterminate = currentGroupProps.indeterminate ?? indeterminatePropValue;

    const computedChecked = isGroupedWithParent.value ? Boolean(groupChecked) : Boolean(checked.value);
    const computedIndeterminate = isGroupedWithParent.value
      ? Boolean(groupIndeterminate || indeterminatePropValue)
      : Boolean(indeterminatePropValue);

    return {
      ...fieldState.value,
      checked: computedChecked,
      disabled: disabled.value,
      readOnly: readOnlyValue,
      required: requiredValue,
      indeterminate: computedIndeterminate,
    };
  });

  // store-as-is 载体：身份稳定 getter 对象（字段路由到 stateValue computed，
  // 消费端 CheckboxIndicator 读字段即追踪；provide 只跑一次，新对象会冻结快照）。
  const rootStateContext: CheckboxRootContext = {
    get checked() {
      return stateValue.value.checked;
    },
    get disabled() {
      return stateValue.value.disabled;
    },
    get readOnly() {
      return stateValue.value.readOnly;
    },
    get required() {
      return stateValue.value.required;
    },
    get indeterminate() {
      return stateValue.value.indeterminate;
    },
    get valid() {
      return stateValue.value.valid;
    },
    get touched() {
      return stateValue.value.touched;
    },
    get dirty() {
      return stateValue.value.dirty;
    },
    get filled() {
      return stateValue.value.filled;
    },
    get focused() {
      return stateValue.value.focused;
    },
  };

  // 值形 props toRefs 活引用；ref 形 props（ref/inputRef）与 state 驱动键
  // （checked/indeterminate/readOnly/required）解构排除——前者直读本體、
  // 后者由 state computed 承担；children 不解构、随 elementRefs 流入。
  const {
    className,
    render,
    style,
    id: _id,
    checked: _checked,
    indeterminate: _indeterminate,
    readOnly: _readOnly,
    required: _required,
    inputRef: _inputRef,
    ref: _forwardRef,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const otherGroupProps = computed(() => {
    const {checked: _gc, indeterminate: _gi, onCheckedChange: _gon, ...rest} = groupProps.value;
    return rest;
  });

  const stateAttributes = computed(() => {
    const mapping = getCheckboxStateAttributesMapping(stateValue.value);
    return getStateAttributes(stateValue.value, mapping);
  });

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值；
  // 回调类 props（onCheckedChange）事件期直读 componentProps（父换新引用也能拿到）。
  const handleInputClick = (event: any) => {
    // The click dispatched from the root's `onClick` is an implementation detail
    // and must not reach ancestors, which already receive the original click.
    event.stopPropagation();

    // actview 的 onChange 对 input 监听 'input' 事件（文本输入语义）；
    // checkbox 的激活由原生 click 表达（click 切换 checked 并触发
    // change，不触发 input）——这里在 click 时执行 React 版 onChange 的逻辑。
    if (event.defaultPrevented) {
      return;
    }

    if (stateValue.value.readOnly) {
      event.preventDefault();
      return;
    }

    const nextChecked = event.currentTarget.checked;
    const details = createChangeEventDetails(REASONS.none, event);

    componentProps.onCheckedChange?.(nextChecked, details);

    if (details.isCanceled) {
      return;
    }

    groupProps.value.onCheckedChange?.(nextChecked, details);

    if (details.isCanceled) {
      return;
    }

    setCheckedState(nextChecked);

    if (
      value.value !== undefined &&
      groupContext !== undefined &&
      !parent.value &&
      !isGroupedWithParent.value
    ) {
      const currentGroupValue = groupContext.value ?? [];
      const nextGroupValue = nextChecked
        ? [...currentGroupValue, value.value]
        : currentGroupValue.filter((item) => item !== value.value);

      groupContext.setValue(nextGroupValue, details);
    }
  };

  const handleInputFocus = () => {
    controlRef.value?.focus();
  };

  const handleRootFocus = () => {
    if (!disabled.value) {
      setFocused(true);
    }
  };

  const handleRootBlur = () => {
    const inputEl = inputRef.value;
    if (!inputEl) {
      return;
    }

    setTouched(true);
    setFocused(false);

    if (validationMode.value === 'onBlur') {
      validation.commit(groupContext ? groupValue : inputEl.checked);
    }
  };

  const handleRootKeyDown = (event: any) => {
    if (event.key !== 'Enter') {
      return;
    }

    // Let consumer `preventDefault()` handlers opt out while defensively stopping
    // any remaining Base UI Enter handling from treating the checkbox as a button.
    event.preventBaseUIHandler();

    if (event.defaultPrevented) {
      return;
    }

    const formToSubmit = inputRef.value?.form ?? null;
    const currentTarget = event.currentTarget;
    const nativeEvent = event;
    const originalPreventDefault = event.preventDefault;
    const originalNativePreventDefault = nativeEvent.preventDefault;
    let preventDefaultCalledAfterPropagation = false;

    event.preventDefault = () => {
      preventDefaultCalledAfterPropagation = true;
      originalPreventDefault.call(event);
    };
    nativeEvent.preventDefault = () => {
      preventDefaultCalledAfterPropagation = true;
      originalNativePreventDefault.call(nativeEvent);
    };

    // Enter should not activate/toggle the checkbox. Cancel the native button behavior
    // without setting React's synthetic `defaultPrevented`, so ancestor React handlers
    // can still opt out by calling `preventDefault()` during propagation.
    originalNativePreventDefault.call(nativeEvent);

    ownerWindow(currentTarget).queueMicrotask(() => {
      event.preventDefault = originalPreventDefault;
      nativeEvent.preventDefault = originalNativePreventDefault;

      if (!preventDefaultCalledAfterPropagation) {
        getDefaultFormSubmitter(formToSubmit)?.click();
      }
    });
  };

  const handleRootClick = (event: MouseEvent) => {
    if (stateValue.value.readOnly || disabled.value) {
      return;
    }

    event.preventDefault();

    const input = inputRef.value;
    if (!input) {
      return;
    }

    dispatchClickWithModifiers(input, event);
  };

  // hidden input props：mergePropsN 链（getValidationProps 消费 prev——getter 放最后）
  const inputProps = computed(() =>
    mergePropsN<any>([
      {
        checked: checked.value,
        disabled: disabled.value,
        form: componentProps.form,
        // parent checkboxes unset `name` to be excluded from form submission
        name: parent.value ? undefined : name.value,
        // Set `id` to stop Chrome warning about an unassociated input.
        // When using a native button, the `id` is applied to the button instead.
        id: nativeButton.value ? undefined : controlId,
        required: stateValue.value.required,
        ref: mergedInputRef,
        style: name.value ? visuallyHiddenInput : visuallyHidden,
        tabIndex: -1,
        type: 'checkbox',
        'aria-hidden': true,
        onClick: handleInputClick,
        onFocus: handleInputFocus,
      },
      componentProps.value !== undefined
        ? {value: (groupContext ? checked.value && componentProps.value : componentProps.value) || ''}
        : EMPTY_OBJECT,
      getDescriptionProps,
      (props: any) => validation.getValidationProps(disabled.value, props),
    ]),
  );

  // 根元素 props：core（aria/handlers）→ 透传 → group 透传 → state data-* →
  // getButtonProps 链（disabled 拦截）→ description → validation。
  const rootProps = computed(() =>
    mergePropsN<any>([
      {
        id: rootId.value,
        role: 'checkbox',
        'aria-checked': stateValue.value.indeterminate ? 'mixed' : stateValue.value.checked,
        'aria-readonly': stateValue.value.readOnly || undefined,
        'aria-required': stateValue.value.required || undefined,
        'aria-labelledby': ariaLabelledBy,
        [PARENT_CHECKBOX as string]: parent.value ? '' : undefined,
        onFocus: handleRootFocus,
        onBlur: handleRootBlur,
        onKeyDown: handleRootKeyDown,
        onClick: handleRootClick,
      },
      elementProps.value,
      otherGroupProps.value,
      stateAttributes.value,
      (prev: any) => getButtonProps(prev),
      (prev: any) => getDescriptionProps(prev),
      (prev: any) => validation.getValidationProps(disabled.value, prev),
    ]),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CheckboxRootContext.Provider value={rootStateContext}>
      {useRenderElement(
        'span',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: stateValue.value,
          ref: useMergedRefs(rootRef, buttonRef, componentProps.ref),
          props: rootProps.value,
        },
      )}
      {!checked.value && !groupContext && name.value && !parent.value && componentProps.uncheckedValue !== undefined && (
        <input
          type="hidden"
          form={componentProps.form}
          name={name.value}
          value={componentProps.uncheckedValue}
          disabled={disabled.value}
        />
      )}
      <input {...inputProps.value} />
    </CheckboxRootContext.Provider>
  );
}

function getStateAttributes(state: Record<string, any>, mapping: Record<string, any>) {
  const props: Record<string, string> = {};
  for (const key in state) {
    const value = state[key];
    if (mapping?.hasOwnProperty(key)) {
      const customProps = mapping[key](value);
      if (customProps != null) {
        Object.assign(props, customProps);
      }
      continue;
    }
    if (value === true) {
      props[`data-${key.toLowerCase()}`] = '';
    } else if (value) {
      props[`data-${key.toLowerCase()}`] = value.toString();
    }
  }
  return props;
}

export interface CheckboxRootState extends FieldRootState {
  /**
   * Whether the checkbox is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate: boolean;
}

export interface CheckboxRootProps
  extends Omit<BaseUIComponentProps<'span', CheckboxRootState>, 'onChange' | 'value'> {
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * Whether the root renders a native `<button>` element.
   * @default false
   */
  nativeButton?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   * @default undefined
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the checkbox is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Whether the checkbox is currently ticked.
   *
   * To render an uncontrolled checkbox, use the `defaultChecked` prop instead.
   * @default undefined
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox is initially ticked.
   *
   * To render a controlled checkbox, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Event handler called when the checkbox is ticked or unticked.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: Ref<HTMLInputElement | null> | undefined;
  /**
   * Whether the checkbox controls a group of child checkboxes.
   *
   * Must be used in a [Checkbox Group](https://base-ui.com/react/components/checkbox-group).
   * @default false
   */
  parent?: boolean | undefined;
  /**
   * The value submitted with the form when the checkbox is unchecked.
   * By default, unchecked checkboxes do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * The checkbox's value. Identifies it within a [Checkbox Group](https://base-ui.com/react/components/checkbox-group), falling back to `name` when omitted.
   * When submitting a form, a checked box submits `value`; with no `value`, it submits the native "on".
   */
  value?: string | undefined;
}

export type CheckboxRootChangeEventReason = typeof REASONS.none;
export type CheckboxRootChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxRoot.ChangeEventReason>;

export namespace CheckboxRoot {
  export type State = CheckboxRootState;
  export type Props = CheckboxRootProps;
  export type ChangeEventReason = CheckboxRootChangeEventReason;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}
