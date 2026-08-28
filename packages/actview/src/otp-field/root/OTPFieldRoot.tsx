import {computed, ref} from 'actview';
import { useId } from '@/utils/useId';
import { useControlled } from '@/utils/useControlled';
import { OTPFieldRootContext, type OTPFieldRootContextValue } from './OTPFieldRootContext';
import { normalizeOTPValue, type OTPValidationType } from '../utils/otp';

/**
 * Groups all parts of the OTP field.
 * Doesn't render its own HTML element.
 *
 * actview 简化：无隐藏 validation input 与 form 联动；
 * 焦点队列（queueFocusInput）未迁移。
 */
export function OTPFieldRoot(props: OTPFieldRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const length = computed(() => props.length ?? 4);
  const validationType = computed(() => props.validationType ?? 'numeric');
  const disabled = computed(() => props.disabled ?? false);
  const readOnly = computed(() => props.readOnly ?? false);
  const required = computed(() => props.required ?? false);
  const invalid = computed(() => props.invalid ?? false);
  const mask = computed(() => props.mask ?? false);
  const autoComplete = computed(() => props.autoComplete ?? 'one-time-code');

  const [valueState, setValueState] = useControlled<string>({
    controlled: () => props.value,
    default: () => props.defaultValue ?? '',
    name: 'OTPFieldRoot',
    state: 'value',
  });

  const value = computed(() => normalizeOTPValue(valueState.value ?? '', length.value, validationType.value));

  const activeIndex = ref(-1);
  const inputId = useId();

  // 事件 handler：setup 闭包读 computed——事件触发时拿到实时值。
  const setValue = (nextValue: string) => {
    const normalized = normalizeOTPValue(nextValue, length.value, validationType.value);
    setValueState(normalized);
    props.onValueChange?.(normalized, {value: normalized});
  };

  const focusInput = (index: number) => {
    const el = document.getElementById(`${inputId}-${index + 1}`);
    (el as HTMLInputElement | null)?.focus?.();
  };

  const handleInputFocus = (index: number) => {
    activeIndex.value = index;
  };

  const handleInputBlur = () => {
    activeIndex.value = -1;
  };

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，渲染期新对象会冻结快照）——value/activeIndex/配置字段渲染期求值。
  const contextValue: OTPFieldRootContextValue = {
    get value() {
      return value.value ?? '';
    },
    get activeIndex() {
      return activeIndex.value;
    },
    setActiveIndex: (index: number) => (activeIndex.value = index),
    setValue,
    get length() {
      return length.value;
    },
    get disabled() {
      return disabled.value;
    },
    get readOnly() {
      return readOnly.value;
    },
    get required() {
      return required.value;
    },
    get invalid() {
      return invalid.value;
    },
    get mask() {
      return mask.value;
    },
    get inputMode() {
      return validationType.value === 'none' ? 'text' : 'numeric';
    },
    get validationType() {
      return validationType.value;
    },
    get autoComplete() {
      return autoComplete.value;
    },
    inputId,
    focusInput,
    handleInputFocus,
    handleInputBlur,
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const state = computed<OTPFieldRootState>(() => ({
    complete: (value.value ?? '').length === length.value,
    disabled: disabled.value,
    filled: (value.value ?? '') !== '',
    focused: activeIndex.value !== -1,
    length: length.value,
    readOnly: readOnly.value,
    required: required.value,
    value: value.value ?? '',
    validationType: validationType.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 兼容 render prop（渲染期求值，表达式内直读）。
  return (
    <OTPFieldRootContext.Provider value={contextValue}>
      {typeof props.children === 'function' ? props.children(state.value) : props.children}
    </OTPFieldRootContext.Provider>
  );
}

export interface OTPFieldRootState {
  /**
   * Whether the OTP value is complete.
   */
  complete: boolean;
  /**
   * Whether the OTP field is disabled.
   */
  disabled: boolean;
  /**
   * Whether the OTP value is filled.
   */
  filled: boolean;
  /**
   * Whether the OTP field is focused.
   */
  focused: boolean;
  /**
   * The number of OTP slots.
   */
  length: number;
  /**
   * Whether the OTP field is read-only.
   */
  readOnly: boolean;
  /**
   * Whether the OTP field is required.
   */
  required: boolean;
  /**
   * The current OTP value.
   */
  value: string;
  /**
   * The validation type.
   */
  validationType: OTPValidationType;
}

export interface OTPFieldRootProps {
  /**
   * The number of OTP slots.
   * @default 4
   */
  length?: number | undefined;
  /**
   * The default OTP value.
   * @default ''
   */
  defaultValue?: string | undefined;
  /**
   * The controlled OTP value.
   */
  value?: string | undefined;
  /**
   * The validation type.
   * @default 'numeric'
   */
  validationType?: OTPValidationType | undefined;
  /**
   * Event handler called when the OTP value changes.
   */
  onValueChange?:
    | ((value: string, eventDetails: {value: string}) => void)
    | undefined;
  /**
   * Whether the OTP field is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the OTP field is read-only.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the OTP field is required.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the OTP field is invalid.
   * @default false
   */
  invalid?: boolean | undefined;
  /**
   * Whether to mask the OTP value.
   * @default false
   */
  mask?: boolean | undefined;
  /**
   * The content of the OTP field. This can be a regular node or a render function.
   */
  children?: any;
  [key: string]: any;
}

export namespace OTPFieldRoot {
  export type State = OTPFieldRootState;
  export type Props = OTPFieldRootProps;
}
