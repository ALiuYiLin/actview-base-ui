import {computed, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useValueChanged } from '@/internals/useValueChanged';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { FieldRootState } from '../root/FieldRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { activeElement } from '@/utils/shadowDom';
import { ownerDocument } from '@/utils/owner';

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
export function FieldControl(componentProps: FieldControl.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const inputRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const {
    state: fieldState,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setDirty,
    validityData,
    setFocused,
    setFilled,
    validationMode,
    validation,
  } = useFieldRootContext();
  const {clearErrors} = useFormContext();
  const {labelId} = useLabelableContext();

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(
    () => fieldDisabled.value || (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldName.value ?? componentProps.name);
  const idProp = componentProps.id;
  const autoFocus = computed(() => componentProps.autoFocus ?? false);

  const id = useLabelableId({id: idProp});

  // 受控/非受控 value（isControlled 取初始化快照，对齐 React 首渲染语义）。
  const isControlled = componentProps.value !== undefined;
  const [valueUnwrapped] = useControlled({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue,
    name: 'FieldControl',
    state: 'value',
  });
  const value = computed(() => (isControlled ? valueUnwrapped.value : undefined));
  // The DOM value is always a string, so dirty comparisons must serialize the controlled value.
  const serializedValue = computed(() =>
    value.value == null ? undefined : String(value.value),
  );

  const getValueFromInput = () => validation.inputRef.value?.value;

  useRegisterFieldControl(
    validation.inputRef,
    id,
    serializedValue,
    getValueFromInput,
    computed(() => !disabled.value),
    () => componentProps.name,
  );

  // React 版 useIsoLayoutEffect：input 有值时标记 filled
  watch(
    () => validation.inputRef.value?.value,
    (v) => {
      if (v) {
        setFilled(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  useValueChanged(serializedValue, () => {
    if (serializedValue.value === undefined) {
      return;
    }

    clearErrors(name.value);
    setDirty(serializedValue.value !== (validityData.value.initialValue ?? ''));
    setFilled(serializedValue.value !== '');

    validation.change(serializedValue.value);
  });

  // React 版 useIsoLayoutEffect：autoFocus 时标记 focused
  watch(
    autoFocus,
    (v) => {
      if (v && inputRef.value === activeElement(ownerDocument(inputRef.value))) {
        setFocused(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const handleInput = (event: Event) => {
    const inputValue = (event.currentTarget as HTMLInputElement).value;
    const details = createChangeEventDetails(REASONS.none, event as any);
    componentProps.onValueChange?.(inputValue, details as any);

    // Controlled values sync from the `value` prop instead, so that a value the consumer
    // rejects or rewrites never reaches the field state.
    if (isControlled) {
      return;
    }

    // `validation.change` reads `markedDirtyRef`, so update dirty before validating.
    setDirty(inputValue !== (validityData.value.initialValue ?? ''));
    setFilled(inputValue !== '');

    // Workaround for https://github.com/react/react/issues/9023
    if (!(event as any).nativeEvent?.defaultPrevented && !details.isCanceled) {
      clearErrors(name.value);
      validation.change(inputValue);
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = (event: Event) => {
    const inputValue = (event.currentTarget as HTMLInputElement).value;
    setTouched(true);
    setFocused(false);

    if (validationMode.value === 'onBlur') {
      validation.commit(inputValue);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      (event.currentTarget as HTMLInputElement).tagName === 'INPUT' &&
      event.key === 'Enter'
    ) {
      setTouched(true);
      validation.commit((event.currentTarget as HTMLInputElement).value);
    }
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // onValueChange/defaultValue 为组件自定义 props（回调/受控默认，
  // defaultValue 由第 195 行显式输出）——剔除，否则泄漏到 DOM。
  const {
    className,
    render,
    style,
    onValueChange: _onValueChange,
    defaultValue: _defaultValue,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<FieldControlState>(() => ({
    ...fieldState.value,
    disabled: disabled.value,
  }));

  // 根元素 props：fixed（id/aria/handlers/value）→ 透传 → validation 包装
  // （getValidationProps 合并 aria-describedby/aria-invalid）。
  const rootProps = computed<Record<string, any>>(() => {
    const base: Record<string, any> = {
      id,
      disabled: disabled.value,
      name: name.value,
      'aria-labelledby': labelId.value,
      autoFocus: autoFocus.value,
      ...(isControlled ? {value: value.value} : {defaultValue: componentProps.defaultValue}),
      onChange: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      ...elementProps.value,
    };
    return validation.getValidationProps(disabled.value, base);
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'input',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: fieldValidityMapping,
          ref: useMergedRefs(
            inputRef,
            (el: any) => {
              validation.inputRef.value = el;
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControlState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: string | number | readonly string[] | undefined;
  disabled?: boolean | undefined;
  name?: string | undefined;
  value?: string | number | readonly string[] | undefined;
  autoFocus?: boolean | undefined;
  id?: string | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails = BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}
