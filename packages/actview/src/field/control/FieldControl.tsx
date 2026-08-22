import { computed, defineComponent, ref, watch } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { type FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useValueChanged } from '@/internals/useValueChanged';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { activeElement } from '@/floating-ui-actview/utils';
import { mergePropsN } from '@/merge-props';

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 *
 * You can omit this part and use any Base UI input component instead. For example,
 * [Input](https://base-ui.com/react/components/input), [Checkbox](https://base-ui.com/react/components/checkbox),
 * or [Select](https://base-ui.com/react/components/select), among others, will work with Field out of the box.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldControl = defineComponent(function (componentProps: FieldControl.Props) {
  // ================= setup（只执行一次） =================
  // context hooks 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const fieldRootContext = useFieldRootContext();
  const formContext = useFormContext();
  const labelableContext = useLabelableContext();

  // set* / validation / clearErrors：context 提供的稳定函数，setup 取一次
  //（FieldRoot 未重构，保持原行为——旧范式同样在 setup 解构）
  const setTouched = fieldRootContext.value.setTouched;
  const setDirty = fieldRootContext.value.setDirty;
  const setFocused = fieldRootContext.value.setFocused;
  const setFilled = fieldRootContext.value.setFilled;
  const validation = fieldRootContext.value.validation;
  const clearErrors = formContext.value.clearErrors;

  const disabled = computed(
    () => (fieldRootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);
  const validityData = computed(() => fieldRootContext.value.validityData);
  const validationMode = computed(() => fieldRootContext.value.validationMode);

  const labelId = computed(() => labelableContext.value.labelId);

  const id = useLabelableId({ id: computed(() => componentProps.id) });

  const valueControlled = useControlled({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue,
    name: 'FieldControl',
    state: 'value',
  });

  const isControlled = computed(() => componentProps.value !== undefined);
  const value = computed(() => (isControlled.value ? valueControlled.value : undefined));
  // The DOM value is always a string, so dirty comparisons must serialize the controlled value.
  const serializedValue = computed(() => (value.value == null ? undefined : String(value.value)));

  const getValueFromInput = () => validation.inputRef.current?.value;

  useRegisterFieldControl(
    validation.inputRef,
    computed(() => id.value ?? undefined),
    serializedValue,
    getValueFromInput,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  useIsoLayoutEffect(() => {
    if (validation.inputRef.current?.value) {
      setFilled(true);
    }
  });

  useValueChanged(serializedValue, () => {
    if (serializedValue.value === undefined) {
      return;
    }

    clearErrors(name.value);
    setDirty(serializedValue.value !== (validityData.value.initialValue ?? ''));
    setFilled(serializedValue.value !== '');

    validation.change(serializedValue.value);
  });

  // 组件根 input 的模板 ref（value 形态，actview 模板 ref 原生支持）。
  // watch flush:sync 同步到 validation.inputRef（{ current } 形态，FieldRoot 提供）——
  // 注册类 ref 模式（案例 7）。defaultValue 的 DOM 属性赋值也在此：
  // actview 渲染器把 defaultValue 当普通属性（setAttribute），不设置 input.value
  // （plantform-diff.md PD-01/PD-19）——镜像 React 行为直接赋属性
  const inputRef = ref<HTMLInputElement | null>(null);

  watch(
    inputRef,
    (node) => {
      validation.inputRef.current = node;
      if (node && !isControlled.value && componentProps.defaultValue !== undefined) {
        node.defaultValue = String(componentProps.defaultValue);
      }
    },
    { flush: 'sync', immediate: true },
  );

  useIsoLayoutEffect(() => {
    if (
      componentProps.autoFocus &&
      inputRef.value === activeElement(ownerDocument(inputRef.value))
    ) {
      setFocused(true);
    }
  });

  // 事件/属性对象：setup 定义（闭包读 computed + props 代理 → 事件时最新值），
  // 渲染期调用得对象（对照案例 12：对象进 mergePropsN 走普通合并路径）
  const getControlProps = () => ({
    id: id.value ?? undefined,
    disabled: disabled.value,
    name: name.value,
    'aria-labelledby': labelId.value ?? undefined,
    autoFocus: componentProps.autoFocus,
    ...(isControlled.value ? { value: value.value } : { defaultValue: componentProps.defaultValue }),
    onInput(event: InputEvent) {
      const input = event.currentTarget as HTMLInputElement;
      const inputValue = input.value;
      const details = createChangeEventDetails(REASONS.none, event);
      componentProps.onValueChange?.(inputValue, details);

      // Controlled values sync from the `value` prop instead, so that a value the consumer
      // rejects or rewrites never reaches the field state.
      if (isControlled.value) {
        return;
      }

      // `validation.change` reads `markedDirtyRef`, so update dirty before validating.
      setDirty(inputValue !== (validityData.value.initialValue ?? ''));
      setFilled(inputValue !== '');

      // Workaround for https://github.com/react/react/issues/9023
      if (!event.defaultPrevented && !details.isCanceled) {
        clearErrors(name.value);
        validation.change(inputValue);
      }
    },
    onFocus() {
      setFocused(true);
    },
    onBlur(event: FocusEvent) {
      setTouched(true);
      setFocused(false);

      if (validationMode.value === 'onBlur') {
        validation.commit((event.currentTarget as HTMLInputElement).value);
      }
    },
    onKeyDown(event: KeyboardEvent) {
      if ((event.currentTarget as HTMLElement).tagName === 'INPUT' && event.key === 'Enter') {
        setTouched(true);
        validation.commit((event.currentTarget as HTMLInputElement).value);
      }
    },
  });

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      id: _id, // setup useLabelableId 已接管
      name: _name, // setup computed 已接管
      value: _value, // setup valueControlled 已接管
      disabled: _disabled, // setup computed 已接管
      onValueChange: _onValueChange, // getControlProps onInput 已接管
      defaultValue: _defaultValue, // watch(inputRef) 已接管
      autoFocus: _autoFocus, // getControlProps 已接管
      style,
      ref: _ref, // 用户 ref：inputRef 内部模板绑定，无需转发
      ...elementProps
    } = componentProps;

    const state: FieldControlState = {
      ...fieldRootContext.value.state,
      disabled: disabled.value,
    };

    // state → data-* 属性（fieldValidityMapping：valid → data-valid/data-invalid）
    const stateAttributes = getStateAttributesProps(state, fieldValidityMapping);

    // getValidationProps 是 propsGetter（消费 previous）→ 传函数放数组最后（案例 12）。
    // 类型放宽：事件签名（InputEvent/KeyboardEvent 等）与 JSX 事件类型不匹配（tsgo 基线同款）
    const merged = mergePropsN([
      getControlProps(),
      stateAttributes,
      elementProps,
      (p: HTMLProps) => validation.getValidationProps(disabled.value, p),
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ] as any);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...state, ref: inputRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={inputRef} />;
    }
    return <input ref={inputRef} {...merged} />;
  };
}) as (props: FieldControl.Props) => any;

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControlState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: string | number | readonly string[] | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}
