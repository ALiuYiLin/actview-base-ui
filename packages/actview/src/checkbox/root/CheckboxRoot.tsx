import { computed, onUnmounted, ref, watch } from 'actview';
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
  const parentContext = groupContext?.allValues === undefined ? undefined : groupContext.parent;
  const isGroupedWithParent = parentContext !== undefined;

  const defaultChecked = componentProps.defaultChecked ?? false;
  const nameProp = componentProps.name;
  const valueProp = componentProps.value;
  const parent = componentProps.parent ?? false;
  const nativeButton = componentProps.nativeButton ?? false;
  const idProp = componentProps.id;
  const form = componentProps.form;
  const uncheckedValue = componentProps.uncheckedValue;
  const ariaLabelledByProp = componentProps['aria-labelledby'];
  const onCheckedChange = componentProps.onCheckedChange;

  // disabled 用 computed：Field.Root / Field.Item / group / 本组件 disabled 动态
  // 变化时渲染期 `.value` 与 useButton 的 watch 都能拿到实时值。
  const disabled = computed(
    () =>
      rootDisabled.value ||
      fieldItemContext.disabled.value ||
      (groupContext?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );
  const name = fieldName.value ?? nameProp;
  const value = valueProp ?? name;

  const id = useBaseUiId();

  // A `CheckboxGroup` is the field's control and takes its name from `aria-labelledby`, so the
  // checkboxes sharing its labelable scope must not claim the field's control id: they would all
  // render that one id and collide. A `Field.Item` opens a scope the checkbox does own.
  const ownsControlId = groupContext?.registerControlId !== registerControlId;

  // `|| undefined` rather than `??`: an empty `id` falls back to the scope's control id.
  const controlId = useLabelableId({id: (idProp as string) || undefined, enabled: ownsControlId});

  const rootId = nativeButton ? controlId : id;

  // computed：group 的 value 变化时重算（setup 快照会导致 checked 的
  // controlled getter 永远读到初始值——渲染期语义）。
  const groupValue = computed(() => (groupContext ? groupContext.value : undefined));

  const controlRef = ref(null as HTMLElement | null);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
  });

  const validation = groupContext?.validation ?? localValidation;

  const [checked, setCheckedState] = useControlled<boolean>({
    controlled: () =>
      value !== undefined && groupValue.value !== undefined && !parent
        ? groupValue.value.includes(value)
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
    nameProp,
  );

  const registerChildId = parentContext?.registerChildId;

  const inputRef = ref(null as HTMLInputElement | null);
  const registerFieldInput = validation.registerInput;
  const registeredInputValue = groupContext ? value : undefined;
  const registerInput = (element: HTMLInputElement) =>
    registerFieldInput(element, {controlRef, value: registeredInputValue});
  // ref 形 props 直读本體（inputRef 的值本身就是 ref 对象——勿经 toRefs/toValue 解包）
  const mergedInputRef = useMergedRefs(
    componentProps.inputRef as any,
    inputRef as any,
    parent ? undefined : (registerInput as any),
  );
  const ariaLabelledBy = useAriaLabelledBy(
    ariaLabelledByProp as string | undefined,
    labelId.value,
    inputRef,
    !nativeButton,
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

    clearErrors(name);
    setFilled(Boolean(checked.value));
    setDirty(Boolean(checked.value) !== validityData.value.initialValue);

    validation.change(Boolean(checked.value));
  });

  // parentContext disabled 状态注册
  watch(
    () => [parentContext, disabled.value, value] as const,
    () => {
      if (!parentContext || value === undefined) {
        return;
      }

      const disabledStates = parentContext.disabledStatesRef.value;
      disabledStates.set(value, disabled.value);

      return () => {
        disabledStates.delete(value);
      };
    },
    {immediate: true},
  );
  onUnmounted(() => {
    if (parentContext && value !== undefined) {
      parentContext.disabledStatesRef.value.delete(value);
    }
  });

  // React 版 useIsoLayoutEffect：子 checkbox 注册 id
  watch(
    () => [parentContext, parent, value, rootId] as const,
    () => {
      if (!registerChildId || parent || value === undefined || rootId === undefined) {
        return;
      }

      const unregister = registerChildId(value, rootId);
      return unregister;
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    if (registerChildId && !parent && value !== undefined && rootId !== undefined) {
      registerChildId(value, rootId)();
    }
  });

  // ---- group props / state：setup 级 computed（读取即追踪，身份稳定供
  //      Provider 载体与渲染两处消费）----
  const groupProps = computed<any>(() => {
    if (!isGroupedWithParent) {
      return {};
    }
    if (parent) {
      return parentContext!.getParentProps() as any;
    }
    if (value !== undefined) {
      return parentContext!.getChildProps(value) as any;
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

    const computedChecked = isGroupedWithParent ? Boolean(groupChecked) : Boolean(checked.value);
    const computedIndeterminate = isGroupedWithParent
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

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，每次渲染新对象会冻结快照）——字段经 getter 路由到 stateValue computed，
  // 消费端（Indicator 等）读字段即追踪。
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

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      <CheckboxRootContext.Provider value={rootStateContext}>
        {(() => {
          // id 由 rootId（暴露元素）与 controlId（hidden input）管理——透传的
          // 自定义 `id` 会覆盖 rootId（React 版语义：custom id 落到 hidden input）。
          const {className, render, style, id: _id, ...elementProps} = componentProps as any;

          // group props 每次渲染重新获取（computed：依赖变化时重算）
          const currentGroupProps = groupProps.value;
          const groupOnChange = currentGroupProps.onCheckedChange;
          const {checked: _gc, indeterminate: _gi, onCheckedChange: _gon, ...otherGroupProps} =
            currentGroupProps;

          const current = stateValue.value;
          const computedChecked = current.checked;
          const computedIndeterminate = current.indeterminate;
          const readOnlyValue = current.readOnly;
          const requiredValue = current.required;

          const inputProps = mergePropsN<any>([
            {
              checked: checked.value,
              disabled: disabled.value,
              form,
              // parent checkboxes unset `name` to be excluded from form submission
              name: parent ? undefined : name,
              // Set `id` to stop Chrome warning about an unassociated input.
              // When using a native button, the `id` is applied to the button instead.
              id: nativeButton ? undefined : controlId,
              required: requiredValue,
              ref: mergedInputRef,
              style: name ? visuallyHiddenInput : visuallyHidden,
              tabIndex: -1,
              type: 'checkbox',
              'aria-hidden': true,
              onClick(event: any) {
                // The click dispatched from the root's `onClick` is an implementation detail
                // and must not reach ancestors, which already receive the original click.
                event.stopPropagation();

                // actview 的 onChange 对 input 监听 'input' 事件（文本输入语义）；
                // checkbox 的激活由原生 click 表达（click 切换 checked 并触发
                // change，不触发 input）——这里在 click 时执行 React 版 onChange 的逻辑。
                if (event.defaultPrevented) {
                  return;
                }

                if (readOnlyValue) {
                  event.preventDefault();
                  return;
                }

                const nextChecked = event.currentTarget.checked;
                const details = createChangeEventDetails(REASONS.none, event);

                onCheckedChange?.(nextChecked, details);

                if (details.isCanceled) {
                  return;
                }

                groupOnChange?.(nextChecked, details);

                if (details.isCanceled) {
                  return;
                }

                setCheckedState(nextChecked);

                if (
                  value !== undefined &&
                  groupContext !== undefined &&
                  !parent &&
                  !isGroupedWithParent
                ) {
                  const currentGroupValue = groupContext.value ?? [];
                  const nextGroupValue = nextChecked
                    ? [...currentGroupValue, value]
                    : currentGroupValue.filter((item) => item !== value);

                  groupContext.setValue(nextGroupValue, details);
                }
              },
              onFocus() {
                controlRef.value?.focus();
              },
            },
            valueProp !== undefined
              ? {value: (groupContext ? checked.value && valueProp : valueProp) || ''}
              : EMPTY_OBJECT,
            getDescriptionProps,
            (props: any) => validation.getValidationProps(disabled.value, props),
          ]);

          const stateAttributesMapping = getCheckboxStateAttributesMapping(current);
          const stateAttributes = getStateAttributes(current, stateAttributesMapping);

          const merged: any = {};
          Object.assign(
            merged,
            {
              id: rootId,
              role: 'checkbox',
              'aria-checked': computedIndeterminate ? 'mixed' : computedChecked,
              'aria-readonly': readOnlyValue || undefined,
              'aria-required': requiredValue || undefined,
              'aria-labelledby': ariaLabelledBy,
              [PARENT_CHECKBOX as string]: parent ? '' : undefined,
              onFocus() {
                if (!disabled.value) {
                  setFocused(true);
                }
              },
              onBlur() {
                const inputEl = inputRef.value;
                if (!inputEl) {
                  return;
                }

                setTouched(true);
                setFocused(false);

                if (validationMode.value === 'onBlur') {
                  validation.commit(groupContext ? groupValue : inputEl.checked);
                }
              },
              onKeyDown(event: any) {
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
              },
              onClick(event: MouseEvent) {
                if (readOnlyValue || disabled.value) {
                  return;
                }

                event.preventDefault();

                const input = inputRef.value;
                if (!input) {
                  return;
                }

                dispatchClickWithModifiers(input, event);
              },
            },
            elementProps,
            otherGroupProps,
            stateAttributes,
          );

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
                  state: current,
                  ref: useMergedRefs(rootRef, componentProps.ref),
                  props: [
                    merged,
                    (prev: any) => getButtonProps(prev),
                    (prev: any) => getDescriptionProps(prev),
                    (prev: any) => validation.getValidationProps(disabled.value, prev),
                  ],
                },
              )}
              {!checked.value && !groupContext && name && !parent && uncheckedValue !== undefined && (
                <input
                  type="hidden"
                  form={form}
                  name={name}
                  value={uncheckedValue}
                  disabled={disabled.value}
                />
              )}
              <input {...inputProps} />
            </CheckboxRootContext.Provider>
          );
        })()}
      </CheckboxRootContext.Provider>
    </>
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
