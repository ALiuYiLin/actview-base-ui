import { computed, onUnmounted, ref, toValue, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { EMPTY_OBJECT } from '@/internals/empty';
import { useControlled } from '@/utils/useControlled';
import { useMergedRefs } from '@/utils/useMergedRefs';
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
import { useRootElementFragment } from '@/internals/useRootElementFragment';

export const PARENT_CHECKBOX = 'data-parent';

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxRoot(componentProps: CheckboxRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{IIFE}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const {clearErrors} = toValue(useFormContext());
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
  } = toValue(useFieldRootContext());
  const fieldItemContext = toValue(useFieldItemContext());
  const {labelId, registerControlId, getDescriptionProps} = toValue(useLabelableContext());

  const groupContextValue = useCheckboxGroupContext();
  const groupContext = groupContextValue.value;
  const parentContext = groupContext?.allValues === undefined ? undefined : groupContext.parent;
  const isGroupedWithParent = parentContext !== undefined;

  const checkedProp = toValue(componentProps.checked);
  const defaultChecked = toValue(componentProps.defaultChecked) ?? false;
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const indeterminateProp = toValue(componentProps.indeterminate) ?? false;
  const nameProp = toValue(componentProps.name);
  const valueProp = toValue(componentProps.value);
  const parent = toValue(componentProps.parent) ?? false;
  const readOnly = toValue(componentProps.readOnly) ?? false;
  const required = toValue(componentProps.required) ?? false;
  const nativeButton = toValue(componentProps.nativeButton) ?? false;
  const idProp = toValue(componentProps.id);
  const form = toValue(componentProps.form);
  const uncheckedValue = toValue(componentProps.uncheckedValue);
  const ariaLabelledByProp = toValue(componentProps['aria-labelledby']);
  const onCheckedChange = componentProps.onCheckedChange;

  const disabled =
    rootDisabled.value || fieldItemContext.disabled || groupContext?.disabled || disabledProp;
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
  // controlled getter 永远读到初始值——PD-15 渲染期语义）。
  const groupValue = computed(() =>
    groupContext ? toValue(groupContext.value) : undefined,
  );

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
        : checkedProp,
    default: defaultChecked,
    name: 'Checkbox',
    state: 'checked',
  });

  useRegisterFieldControl(
    controlRef as any,
    id,
    checked.value,
    undefined,
    !groupContext && !disabled,
    nameProp,
  );

  const registerChildId = parentContext?.registerChildId;

  const inputRef = ref(null as HTMLInputElement | null);
  const registerFieldInput = validation.registerInput;
  const registeredInputValue = groupContext ? value : undefined;
  const registerInput = (element: HTMLInputElement) =>
    registerFieldInput(element, {controlRef, value: registeredInputValue});
  const mergedInputRef = useMergedRefs(
    toValue(componentProps.inputRef) as any,
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
    () => [checked.value, indeterminateProp] as const,
    () => {
      if (inputRef.value) {
        inputRef.value.indeterminate = Boolean(indeterminateProp);
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
    () => [parentContext, disabled, value] as const,
    () => {
      if (!parentContext || value === undefined) {
        return;
      }

      const disabledStates = parentContext.disabledStatesRef.value;
      disabledStates.set(value, disabled);

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

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 渲染期逻辑（state/inputProps/rootProps 构建）在 IIFE 中执行（PD-15）
  return (
    <>
      {(() => {
        // id 由 rootId（暴露元素）与 controlId（hidden input）管理——透传的
        // 自定义 `id` 会覆盖 rootId（React 版语义：custom id 落到 hidden input）。
        const {className, render, style, id: _id, ...elementProps} = componentProps as any;

        // group props 每次渲染重新获取（对齐 React 版每次 render 调用）
        let groupProps: any = {};
        if (isGroupedWithParent) {
          if (parent) {
            groupProps = parentContext.getParentProps() as any;
          } else if (value !== undefined) {
            groupProps = parentContext.getChildProps(value) as any;
          }
        }

        const groupChecked = groupProps.checked ?? checkedProp ?? false;
        const groupIndeterminate = groupProps.indeterminate ?? indeterminateProp;
        const groupOnChange = groupProps.onCheckedChange;
        const {checked: _gc, indeterminate: _gi, onCheckedChange: _gon, ...otherGroupProps} =
          groupProps;

        const computedChecked = isGroupedWithParent ? Boolean(groupChecked) : Boolean(checked.value);
        const computedIndeterminate = isGroupedWithParent
          ? Boolean(groupIndeterminate || indeterminateProp)
          : Boolean(indeterminateProp);

        const stateValue: CheckboxRootState = {
          ...fieldState.value,
          checked: computedChecked,
          disabled,
          readOnly,
          required,
          indeterminate: computedIndeterminate,
        };

        const inputProps = mergePropsN<any>([
          {
            checked: checked.value,
            disabled,
            form,
            // parent checkboxes unset `name` to be excluded from form submission
            name: parent ? undefined : name,
            // Set `id` to stop Chrome warning about an unassociated input.
            // When using a native button, the `id` is applied to the button instead.
            id: nativeButton ? undefined : controlId,
            required,
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

              if (readOnly) {
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
                const currentGroupValue = toValue(groupContext.value) ?? [];
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
          (props: any) => validation.getValidationProps(disabled, props),
        ]);

        const stateAttributesMapping = getCheckboxStateAttributesMapping(stateValue);
        const stateAttributes = getStateAttributes(stateValue, stateAttributesMapping);

        const merged: any = {};
        Object.assign(
          merged,
          {
            id: rootId,
            role: 'checkbox',
            'aria-checked': computedIndeterminate ? 'mixed' : computedChecked,
            'aria-readonly': readOnly || undefined,
            'aria-required': required || undefined,
            'aria-labelledby': ariaLabelledBy,
            [PARENT_CHECKBOX as string]: parent ? '' : undefined,
            onFocus() {
              if (!disabled) {
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
              if (readOnly || disabled) {
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

        const rootProps = mergePropsN<any>([
          merged,
          getButtonProps,
          getDescriptionProps,
          (props: any) => validation.getValidationProps(disabled, props),
        ]);

        // 渲染 tip 的 children（子组件内容）
        const children = componentProps.children;
        rootProps.children = children;

        if (typeof className === 'function') {
          rootProps.className = className(stateValue);
        } else if (className !== undefined) {
          rootProps.className = className;
        }
        if (typeof style === 'function') {
          rootProps.style = style(stateValue);
        } else if (style !== undefined) {
          rootProps.style = style;
        }

        const element = <span {...rootProps} ref={rootRef} />;

        return (
          <CheckboxRootContext.Provider value={stateValue as any}>
            {element}
            {!checked.value && !groupContext && name && !parent && uncheckedValue !== undefined && (
              <input
                type="hidden"
                form={form}
                name={name}
                value={uncheckedValue}
                disabled={disabled}
              />
            )}
            <input {...inputProps} />
          </CheckboxRootContext.Provider>
        );
      })()}
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
   * @default false
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




















