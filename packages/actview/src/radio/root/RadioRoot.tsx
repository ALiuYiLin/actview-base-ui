import { defineComponent, toValue, useRootElement, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { useMergedRefs } from '@/utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@/utils/visuallyHidden';
import { EMPTY_OBJECT } from '@/internals/empty';
import type { HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { NOOP } from '@/internals/noop';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { dispatchClickWithModifiers } from '@/utils/dispatchClickWithModifiers';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useButton } from '@/internals/use-button';
import { ACTIVE_COMPOSITE_ITEM } from '@/internals/composite/constants';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useFieldItemContext } from '@/field/item/FieldItemContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '@/internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { useRadioGroupContext } from '@/radio-group/RadioGroupContext';
import { serializeValue } from '@/internals/serializeValue';
import { RadioRootContext } from './RadioRootContext';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export const RadioRoot = defineComponent(function <Value>(componentProps: RadioRoot.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const groupContextRef = useRadioGroupContext();

  const {
    setTouched: setFieldTouched,
    setFilled,
    state: fieldState,
    disabled: fieldDisabled,
  } = toValue(useFieldRootContext());
  const fieldItemContext = toValue(useFieldItemContext());
  const {labelId, getDescriptionProps} = toValue(useLabelableContext());

  const disabledProp = toValue(componentProps.disabled) ?? false;
  const readOnlyProp = toValue(componentProps.readOnly) ?? false;
  const requiredProp = toValue(componentProps.required) ?? false;
  const ariaLabelledByProp = toValue(componentProps['aria-labelledby']);
  const value = toValue(componentProps.value);
  const inputRefProp = componentProps.inputRef as any;
  const nativeButton = toValue(componentProps.nativeButton) ?? false;
  const idProp = toValue(componentProps.id);

  const radioRef = {current: null as HTMLElement | null};
  const inputRef = {current: null as HTMLInputElement | null};

  const registerFieldInput = undefined; // groupContext 里取
  const registerInput = (element: HTMLInputElement) => {
    const validation = groupContextRef.value?.validation;
    validation?.registerInput?.(element, {controlRef: radioRef, value: undefined});
  };
  const groupRegisterInputRef = (el: HTMLInputElement | null) =>
    groupContextRef.value?.registerInputRef?.(el);
  const mergedInputRef = useMergedRefs(
    inputRefProp,
    inputRef as any,
    groupRegisterInputRef as any,
    registerInput as any,
  );

  const id = useBaseUiId();
  const inputId = useLabelableId({id: idProp});
  const hiddenInputId = nativeButton ? undefined : inputId;
  const ariaLabelledBy = useAriaLabelledBy(
    ariaLabelledByProp as string | undefined,
    labelId.value,
    inputRef,
    !nativeButton,
    hiddenInputId,
  );

  // React 版 useIsoLayoutEffect：input checked → filled
  watch(
    () => inputRef.current?.checked,
    (checked) => {
      if (checked) {
        setFilled(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  // React 版 useIsoLayoutEffect：registerInputRef 同步（组内代表 input 转发）
  watch(
    () => {
      const group = groupContextRef.value;
      return {
        disabled: computeDisabled(),
        checked: computeChecked(group?.checkedValue?.value),
        registerInputRef: group?.registerInputRef,
      };
    },
    (state) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      if (state.disabled && state.checked) {
        state.registerInputRef?.(null);
        return;
      }

      state.registerInputRef?.(input);
    },
    {flush: 'post', immediate: true},
  );

  function computeDisabled() {
    const group = groupContextRef.value;
    return (
      fieldDisabled.value ||
      fieldItemContext.disabled ||
      group?.disabled ||
      disabledProp
    );
  }

  function computeChecked(groupCheckedValue: any) {
    return groupContextRef.value ? groupCheckedValue === value : value === '';
  }
  const {getButtonProps, buttonRef} = useButton({
    disabled: computeDisabled(),
    native: nativeButton,
    composite: false,
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const groupContext = groupContextRef.value;
    const disabled = computeDisabled();
    const readOnly = (groupContext?.readOnly || readOnlyProp) ?? false;
    const required = (groupContext?.required || requiredProp) ?? false;
    const form = groupContext?.form;
    const touched = groupContext?.touched ?? false;
    const checked = computeChecked(groupContext?.checkedValue?.value);
    const name = groupContext?.name;

    const rootProps: Record<string, any> = {
      role: 'radio',
      'aria-checked': checked,
      'aria-labelledby': ariaLabelledBy,
      [ACTIVE_COMPOSITE_ITEM as string]: checked ? '' : undefined,
      id: nativeButton ? inputId : id,
      onKeyDown(event: any) {
        if (event.key === 'Enter') {
          // Radio only activates with Space. Preventing the keydown's default
          // stops useButton from turning Enter into a click.
          event.preventDefault();
        }
      },
      onClick(event: any) {
        if (event.defaultPrevented || disabled || readOnly) {
          return;
        }

        event.preventDefault();

        const input = inputRef.current;
        if (!input) {
          return;
        }

        dispatchClickWithModifiers(input, event);
      },
      onFocus(event: any) {
        if (event.defaultPrevented || disabled || readOnly || !touched) {
          return;
        }

        inputRef.current?.click();

        groupContext?.setTouched(false);
      },
    };

    const inputProps: Record<string, any> = {
      type: 'radio',
      ref: mergedInputRef,
      form,
      id: hiddenInputId,
      name,
      tabIndex: -1,
      style: name ? visuallyHiddenInput : visuallyHidden,
      'aria-hidden': true,
      ...(value !== undefined ? {value: serializeValue(value)} : EMPTY_OBJECT),
      disabled,
      checked,
      required,
      readOnly,
      onClick(event: any) {
        // actview 的 onChange 对 input 监听 'input' 事件；radio 的激活由
        // 原生 click 表达（click 切换 checked）——这里在 click 时执行
        // React 版 onChange 的逻辑。
        // Clicks dispatched on the input from the root's `onClick` and `onFocus`
        // are an implementation detail and must not reach ancestors.
        event.stopPropagation();

        if (event.defaultPrevented) {
          return;
        }

        if (disabled || readOnly || value === undefined) {
          return;
        }

        const details = createChangeEventDetails(REASONS.none, event);

        groupContext?.setCheckedValue(value, details);

        if (details.isCanceled) {
          return;
        }

        setFieldTouched(true);
      },
      onFocus() {
        radioRef.current?.focus();
      },
    };

    const state: RadioRootState = {
      ...fieldState.value,
      required,
      disabled,
      readOnly,
      checked,
    };

    const contextValue: RadioRootContext = state;
    const isRadioGroup = groupContext !== undefined;

    const refs = [rootRef as any, radioRef as any, buttonRef];
    const props = [
      rootProps,
      elementProps,
      getButtonProps,
      getDescriptionProps,
      groupContext?.validation
        ? (validationProps: HTMLProps) =>
            groupContext.validation!.getValidationProps(disabled, validationProps)
        : EMPTY_OBJECT,
    ];

    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const spanProps = (): Record<string, any> => {
      const merged: Record<string, any> = {};
      for (const prop of props) {
        // props getter 接收 previousProps（对齐 React mergePropsN 语义）
        const resolved = typeof prop === 'function' ? prop(merged) : prop;
        Object.assign(merged, resolved);
      }
      Object.assign(merged, stateAttributes);
      if (typeof className === 'function') {
        merged.className = className(state);
      } else if (className !== undefined) {
        merged.className = className;
      }
      if (typeof style === 'function') {
        merged.style = style(state);
      } else if (style !== undefined) {
        merged.style = style;
      }
      return merged;
    };

    let element: any;
    if (render) {
      const merged = spanProps();
      if (typeof render === 'function') {
        element = render({...merged, ...state, ref: rootRef} as any);
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
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <span {...spanProps()} ref={rootRef} />;
    }

    return (
      <RadioRootContext.Provider value={contextValue as any}>
        {isRadioGroup ? (
          <CompositeItem
            tag="span"
            render={render}
            className={className}
            style={style}
            state={state}
            refs={refs}
            props={props}
            stateAttributesMapping={stateAttributesMapping}
            children={componentProps.children}
          />
        ) : (
          element
        )}
        <input {...inputProps} />
      </RadioRootContext.Provider>
    );
  };
}) as unknown as <Value>(props: RadioRoot.Props<Value>) => JSX.Element;

export interface RadioRootState extends FieldRootState {
  /**
   * Whether the radio button is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
}

export interface RadioRootProps<Value = any>
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', RadioRootState>, 'value'> {
  /**
   * The unique identifying value of the radio in a group.
   */
  value: Value;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly?: boolean | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: {current: HTMLInputElement | null} | ((element: HTMLInputElement | null) => void) | undefined;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props<TValue = any> = RadioRootProps<TValue>;
}
