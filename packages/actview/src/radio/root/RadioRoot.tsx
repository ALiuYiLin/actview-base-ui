import { computed, defineComponent, onMounted, onUnmounted, ref, useRootElement, watch } from 'actview';
import { mergeRefsN } from '@base-ui/actview-utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type {
  BaseUIComponentProps,
  HTMLProps,
  NonNativeButtonProps,
  RefValue,
} from '@/internals/types';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { stateAttributesMapping } from '@/radio/utils/stateAttributesMapping';
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
import { RadioRootContext } from '@/radio/root/RadioRootContext';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergePropsN } from '@/merge-props';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export const RadioRoot = defineComponent(function <Value>(componentProps: RadioRoot.Props<Value>) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）；group/field-root/field-item/labelable
  // 都返回 ref 形态，读 .value 一致
  const groupContext = useRadioGroupContext();
  const fieldRootContext = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  const nativeButton = computed(() => componentProps.nativeButton ?? false);

  const disabled = computed<boolean>(
    () =>
      fieldRootContext.value.disabled ||
      fieldItemContext.value.disabled ||
      groupContext.value?.disabled ||
      componentProps.disabled ||
      false,
  );
  const readOnly = computed<boolean>(
    () => groupContext.value?.readOnly || componentProps.readOnly || false,
  );
  const required = computed<boolean>(
    () => groupContext.value?.required || componentProps.required || false,
  );
  const form = computed(() => groupContext.value?.form);
  const name = computed(() => groupContext.value?.name);
  const touched = computed(() => groupContext.value?.touched ?? false);
  const setTouched = (value: boolean) => groupContext.value?.setTouched?.(value);

  const checked = computed<boolean>(() =>
    groupContext.value
      ? groupContext.value.checkedValue === componentProps.value
      : componentProps.value === '',
  );

  // 组件根 DOM：subTree.el 沿挂载链传播（Provider 包裹也收敛到最终根元素），
  // useRootElement 推导绑定（对照 Toggle）。
  // inputRef / radioRef 都用标准 ref()（value 形态，案例 6）——手动 { current }
  // 对象不符合 actview ref 规范；radioRef 的依赖方（validation.registerInput 的
  // controlRef 读取处）已同步适配 .value（useFieldValidation）
  const rootRef = useRootElement();
  const radioRef = ref<HTMLElement | null>(null);
  const inputRef = ref<HTMLInputElement | null>(null);
  watch(
    rootRef,
    (el) => {
      radioRef.value = el;
    },
    { immediate: true, flush: 'sync' },
  );

  const registerInput = (element: HTMLInputElement | null) => {
    if (element) {
      groupContext.value?.validation?.registerInput(element, {
        controlRef: radioRef,
        value: undefined,
      });
    }
  };

  // 保存最后一次有效 attach 的 cleanup（案例 7 方案 B 变体：卸载清理必须显式）。
  // 组件子树卸载时 input 元素 ref 的 attach cleanup 不会被调用（applyRef 只处理
  // 组件自身 ref，不递归子树元素）→ detach 链断裂 → groupInputRef 残留、inputRef
  // 不置 null。disabled 分支返回 undefined 时不覆盖（保留最后一次有效 cleanup）。
  let detachInputRef: (() => void) | undefined;
  const registerInputRef = (element: HTMLInputElement | null) => {
    const cleanup = groupContext.value?.registerInputRef?.(element);
    if (cleanup) {
      detachInputRef = cleanup;
    }
    return cleanup;
  };

  onUnmounted(() => {
    detachInputRef?.();
    detachInputRef = undefined;
  });

  const getInputRef = () =>
    mergeRefsN<HTMLInputElement>([
      componentProps.inputRef,
      inputRef,
      registerInputRef,
      registerInput,
    ]);

  // React 版 eventDetails.event 是 click 事件：React 对 radio/checkbox 的 onChange
  // 由 click 委托触发（nativeEvent 是 click）。actview 是原生 change 监听，而 jsdom
  // 的 change 事件不继承 click 的修饰键（shiftKey 等为 undefined）——记录 input 上
  // 触发激活的 click，onChange 用它构造 details（React 语义对齐；无 click 时回退
  // change 事件本身）。事件顺序：input click（监听器先跑）→ 激活 → change。
  let lastInputClickEvent: MouseEvent | null = null;

  onMounted(() => {
    if (inputRef.value?.checked) {
      fieldRootContext.value.setFilled(true);
    }
  });

  const syncRegisterInputRef = () => {
    if (!inputRef.value) {
      return;
    }

    if (disabled.value && checked.value) {
      registerInputRef(null);
      return;
    }

    registerInputRef(inputRef.value);
  };

  onMounted(syncRegisterInputRef);
  watch([() => checked.value, () => disabled.value], syncRegisterInputRef);

  const id = useBaseUiId();
  // labelable hooks 的 MaybeRef 不含 getter 形态——必须传 computed（Ref），
  // 传 getter 会被 unref 原样返回 → 渲染成字符串（旧版遗留 bug，测试暴露）
  const inputId = useLabelableId({ id: computed(() => componentProps.id) });
  const hiddenInputId = computed(() => (nativeButton.value ? undefined : inputId.value));
  const ariaLabelledBy = useAriaLabelledBy(
    computed(() => componentProps['aria-labelledby']),
    computed(() => labelableContext.value.labelId),
    inputRef,
    computed(() => !nativeButton.value),
    // labelSourceId 必须 reactive（computed）：generatedLabelId 派生跟随当前值，
    // 传快照会在 id 变化后仍用旧前缀（labelA.id === labelB.id）
    computed(() => (nativeButton.value ? undefined : (inputId.value ?? undefined))),
  );

  const { getButtonProps } = useButton({
    disabled,
    native: nativeButton,
    composite: false,
  });

  const state = computed<RadioRootState>(() => ({
    ...fieldRootContext.value.state,
    required: required.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    checked: checked.value,
  }));

  const isRadioGroup = computed(() => groupContext.value !== undefined);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      disabled: _disabled, // setup computed 已接管
      readOnly: _readOnly, // setup computed 已接管
      required: _required, // setup computed 已接管
      'aria-labelledby': _ariaLabelledBy, // setup useAriaLabelledBy 已接管
      value,
      inputRef: _inputRef, // setup getInputRef 已接管
      nativeButton: _nativeButton, // setup computed 已接管
      id: _id, // setup useLabelableId/useBaseUiId 已接管
      style,
      ref: _ref, // 用户 ref：根由 useRootElement 自取，不显式转发（对照 MeterRoot）
      ...elementProps
    } = componentProps;

    const rootProps: HTMLProps = {
      role: 'radio',
      'aria-checked': checked.value,
      'aria-labelledby': ariaLabelledBy.value,
      [ACTIVE_COMPOSITE_ITEM as string]: checked.value ? '' : undefined,
      id: nativeButton.value ? inputId.value : id,
      onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
          // Radio only activates with Space. Preventing the keydown's default
          // stops useButton from turning Enter into a click.
          event.preventDefault();
        }
      },
      onClick(event: MouseEvent) {
        if (event.defaultPrevented || disabled.value || readOnly.value) {
          return;
        }

        event.preventDefault();

        const input = inputRef.value;
        if (!input) {
          return;
        }

        dispatchClickWithModifiers(input, event);
      },
      onFocus(event: FocusEvent) {
        if (event.defaultPrevented || disabled.value || readOnly.value || !touched.value) {
          return;
        }

        inputRef.value?.click();

        setTouched(false);
      },
    };

    const inputProps: HTMLProps = {
      type: 'radio',
      ref: getInputRef(),
      form: form.value,
      id: hiddenInputId.value,      name: name.value,
      tabIndex: -1,
      style: name.value ? visuallyHiddenInput : visuallyHidden,
      'aria-hidden': true,
      ...(value !== undefined ? { value: serializeValue(value) } : EMPTY_OBJECT),
      disabled: disabled.value,
      checked: checked.value,
      required: required.value,
      readOnly: readOnly.value,
      // React 版是合成 onChange（对 radio 由 click/input 委托触发）；actview 只绑
      // 原生事件——原生 change 事件（input 激活后触发）语义与 React onChange 不对齐，
      // 用 onInput（原生 input 事件，radio 激活时触发，先于 change）
      onInput(event: Event) {
        // Workaround for https://github.com/react/react/issues/9023
        // ActView dispatches native DOM events, so `defaultPrevented` is read directly.
        if (event.defaultPrevented) {
          return;
        }

        if (disabled.value || readOnly.value || value === undefined) {
          return;
        }

        const details = createChangeEventDetails(REASONS.none, lastInputClickEvent ?? event);

        groupContext.value?.setCheckedValue?.(value, details);

        if (details.isCanceled) {
          return;
        }

        fieldRootContext.value.setTouched(true);
      },
      onClick(event: MouseEvent) {
        // Clicks dispatched on the input from the root's `onClick` and `onFocus` are an
        // implementation detail and must not reach ancestors.
        lastInputClickEvent = event;
        event.stopPropagation();
      },
      onFocus() {
        radioRef.value?.focus();
      },
    };

    // propsGetter 链：getButtonProps / getDescriptionProps / getValidationProps 都是函数
    // （消费 previousProps），getValidationProps 放最后（disabled 拦截在最外层，案例 10）
    const props: Array<Record<string, any> | ((p: HTMLProps) => Record<string, any>)> = [
      rootProps,
      elementProps,
      getButtonProps,
      (externalProps: HTMLProps) => labelableContext.value.getDescriptionProps(externalProps),
      groupContext.value?.validation
        ? (externalProps: HTMLProps) =>
            groupContext.value!.validation!.getValidationProps(disabled.value, externalProps)
        : (EMPTY_OBJECT as HTMLProps),
    ];

    // 非 group（独立 Radio.Root）：三形态（对照案例 2/3），state → data-* 手动合并
    const stateAttributes = getStateAttributesProps(state.value, stateAttributesMapping);
    const merged = mergePropsN([...props, stateAttributes]);

    const element = isRadioGroup.value ? (
      <CompositeItem
        tag="span"
        render={render}
        className={className}
        style={style}
        state={state}
        props={props}
        stateAttributesMapping={stateAttributesMapping}
      />
    ) : (
      (() => {
        if (typeof render === 'function') {
          return render({ ...merged, ...state.value, ref: rootRef });
        }
        if (render) {
          const Tag = render.type as any;
          return <Tag key={render.key} {...render.props} {...merged} />;
        }
        return <span {...merged} />;
      })()
    );

    return (
      // 官方 createContext：Provider 传值不传 ref（value={state.value}，computed 惰性
      // 缓存保引用稳定；传 computed 对象则 watch 引用不变永不同步，案例 5）。
      // children 必须包 Fragment：Provider 直接返回 children，数组（element + input）
      // 不扁平化会被当单个 child → <undefined> 元素（renderer.ts normalizeChildren）
      <RadioRootContext.Provider value={state.value}>
        <>
          {element}
          <input {...inputProps} />
        </>
      </RadioRootContext.Provider>
    );
  };
}) as <Value>(props: RadioRoot.Props<Value>) => any;

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
  /**
   * Whether the radio button has been touched (when wrapped in Field.Root).
   */
  touched: boolean;
  /**
   * Whether the radio button's value has changed from its initial value (when wrapped in Field.Root).
   */
  dirty: boolean;
  /**
   * Whether the radio button is in a valid state (when wrapped in Field.Root).
   */
  valid: boolean | null;
  /**
   * Whether the radio button has a value (when wrapped in Field.Root).
   */
  filled: boolean;
  /**
   * Whether the radio button is focused (when wrapped in Field.Root).
   */
  focused: boolean;
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
  inputRef?: RefValue<HTMLInputElement> | undefined;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props<TValue = any> = RadioRootProps<TValue>;
}
