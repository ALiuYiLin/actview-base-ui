import {computed, ref, toRefs, watch} from 'actview';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@/utils/visuallyHidden';
import { EMPTY_OBJECT } from '@/internals/empty';
import type { HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
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
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioRoot<Value>(componentProps: RadioRoot.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 refs：经 params.ref / CompositeItem refs 透传（不用 useRootElement）。
  const rootRef = ref(null as HTMLElement | null);
  const radioRef = ref(null as HTMLElement | null);
  const inputRef = ref(null as HTMLInputElement | null);

  const groupContext = useRadioGroupContext();

  const {
    setTouched: setFieldTouched,
    setFilled,
    state: fieldState,
    disabled: fieldDisabled,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const {labelId, getDescriptionProps} = useLabelableContext();

  // 初始化型快照（config props——setup 一次性消费语义，对齐 React）。
  const ariaLabelledByProp = componentProps['aria-labelledby'];
  const value = componentProps.value;
  const inputRefProp = componentProps.inputRef as any;
  const nativeButton = componentProps.nativeButton ?? false;
  const idProp = componentProps.id;

  const registerInput = (element: HTMLInputElement) => {
    const validation = groupContext?.validation;
    validation?.registerInput?.(element, {controlRef: radioRef, value: undefined});
  };
  const groupRegisterInputRef = (el: HTMLInputElement | null) =>
    groupContext?.registerInputRef?.(el);
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

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // disabled/readOnly/required：Field.Root / Field.Item / group / 本组件动态
  // 变化时 useButton 的 watch 与渲染期 `.value` 都能拿到实时值。
  const disabled = computed(() => {
    const group = groupContext;
    return (
      fieldDisabled.value ||
      fieldItemContext.disabled.value ||
      (group?.disabled.value ?? false) ||
      (componentProps.disabled ?? false)
    );
  });
  const readOnly = computed(
    () => (groupContext?.readOnly.value || (componentProps.readOnly ?? false)) ?? false,
  );
  const required = computed(
    () => (groupContext?.required.value || (componentProps.required ?? false)) ?? false,
  );
  const form = computed(() => groupContext?.form.value);
  const touched = computed(() => groupContext?.touched.value ?? false);
  const checked = computed(() => {
    const groupCheckedValue = groupContext?.checkedValue.value;
    return groupContext ? groupCheckedValue === value : value === '';
  });
  const name = computed(() => groupContext?.name.value);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
    composite: false,
  });

  // React 版 useIsoLayoutEffect：input checked → filled
  watch(
    () => inputRef.value?.checked,
    (checked) => {
      if (checked) {
        setFilled(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  // React 版 useIsoLayoutEffect：registerInputRef 同步（组内代表 input 转发）
  watch(
    () => ({
      disabled: disabled.value,
      checked: checked.value,
      registerInputRef: groupContext?.registerInputRef,
    }),
    (current) => {
      const input = inputRef.value;
      if (!input) {
        return;
      }

      if (current.disabled && current.checked) {
        current.registerInputRef?.(null);
        return;
      }

      current.registerInputRef?.(input);
    },
    {flush: 'post', immediate: true},
  );

  const state = computed<RadioRootState>(() => ({
    ...fieldState.value,
    required: required.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    checked: checked.value,
  }));

  // store-as-is 载体：身份稳定 getter 对象（provide 只跑一次，渲染期新对象
  // 会冻结快照）——字段路由到 state computed，消费端 RadioIndicator 读字段即追踪。
  const radioStateContext: RadioRootContext = {
    get checked() {
      return state.value.checked;
    },
    get disabled() {
      return state.value.disabled;
    },
    get readOnly() {
      return state.value.readOnly;
    },
    get required() {
      return state.value.required;
    },
    get valid() {
      return state.value.valid;
    },
    get touched() {
      return state.value.touched;
    },
    get dirty() {
      return state.value.dirty;
    },
    get filled() {
      return state.value.filled;
    },
    get focused() {
      return state.value.focused;
    },
  };

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const handleRootKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      // Radio only activates with Space. Preventing the keydown's default
      // stops useButton from turning Enter into a click.
      event.preventDefault();
    }
  };

  const handleRootClick = (event: any) => {
    if (event.defaultPrevented || disabled.value || readOnly.value) {
      return;
    }

    event.preventDefault();

    const input = inputRef.value;
    if (!input) {
      return;
    }

    dispatchClickWithModifiers(input, event);
  };

  const handleRootFocus = (event: any) => {
    if (event.defaultPrevented || disabled.value || readOnly.value || !touched.value) {
      return;
    }

    inputRef.value?.click();

    groupContext?.setTouched(false);
  };

  const handleInputClick = (event: any) => {
    // actview 的 onChange 对 input 监听 'input' 事件；radio 的激活由
    // 原生 click 表达（click 切换 checked）——这里在 click 时执行
    // React 版 onChange 的逻辑。
    // Clicks dispatched on the input from the root's `onClick` and `onFocus`
    // are an implementation detail and must not reach ancestors.
    event.stopPropagation();

    if (event.defaultPrevented) {
      return;
    }

    if (disabled.value || readOnly.value || value === undefined) {
      return;
    }

    const details = createChangeEventDetails(REASONS.none, event);

    groupContext?.setCheckedValue(value, details);

    if (details.isCanceled) {
      return;
    }

    setFieldTouched(true);
  };

  const handleInputFocus = () => {
    radioRef.value?.focus();
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { render, className, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const rootPropsBase = computed<Record<string, any>>(() => ({
    role: 'radio',
    'aria-checked': checked.value,
    'aria-labelledby': ariaLabelledBy,
    [ACTIVE_COMPOSITE_ITEM as string]: checked.value ? '' : undefined,
    id: nativeButton ? inputId : id,
    onKeyDown: handleRootKeyDown,
    onClick: handleRootClick,
    onFocus: handleRootFocus,
  }));

  const stateAttributes = computed(() =>
    getStateAttributesProps(state.value, stateAttributesMapping),
  );

  const isRadioGroup = groupContext !== undefined;

  const refs = [rootRef as any, radioRef as any, buttonRef];

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // hidden input 两个分支都必须渲染（group 模式下为 CompositeItem 的兄弟节点）。
  const inputProps = computed<Record<string, any>>(() => ({
    type: 'radio',
    ref: mergedInputRef,
    form: form.value,
    id: hiddenInputId,
    name: name.value,
    tabIndex: -1,
    style: name.value ? visuallyHiddenInput : visuallyHidden,
    'aria-hidden': true,
    ...(value !== undefined ? {value: serializeValue(value)} : EMPTY_OBJECT),
    disabled: disabled.value,
    checked: checked.value,
    required: required.value,
    readOnly: readOnly.value,
    onClick: handleInputClick,
    onFocus: handleInputFocus,
  }));

  return (
    <>
      <RadioRootContext.Provider value={radioStateContext}>
        {isRadioGroup ? (
          <>
            <CompositeItem
              tag="span"
              render={render}
              className={className}
              style={style}
              state={state.value}
              refs={refs}
              props={[
                rootPropsBase.value,
                elementProps.value,
                getButtonProps,
                getDescriptionProps,
                groupContext?.validation
                  ? (validationProps: HTMLProps) =>
                      groupContext.validation!.getValidationProps(disabled.value, validationProps)
                  : EMPTY_OBJECT,
              ]}
              stateAttributesMapping={stateAttributesMapping}
            />
            <input {...inputProps.value} />
          </>
        ) : (
          <>
            {useRenderElement(
              'span',
              {
                className: className?.value,
                render: render?.value,
                style: style?.value,
              },
              {
                state: state.value,
                ref: useMergedRefs(rootRef, radioRef, buttonRef, componentProps.ref),
                props: [
                  rootPropsBase.value,
                  elementProps.value,
                  getButtonProps,
                  getDescriptionProps,
                  // 非 group 模式（groupContext === undefined）无 validation 注入。
                  EMPTY_OBJECT,
                  stateAttributes.value,
                ],
              },
            )}
            <input {...inputProps.value} />
          </>
        )}
      </RadioRootContext.Provider>
    </>
  );
}

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
  inputRef?: Ref<HTMLInputElement | null> | ((element: HTMLInputElement | null) => void) | undefined;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props<TValue = any> = RadioRootProps<TValue>;
}
