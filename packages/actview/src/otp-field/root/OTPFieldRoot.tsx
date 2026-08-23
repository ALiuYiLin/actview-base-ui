import { defineComponent, computed, ref, toValue, watch, onUnmounted } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import { useControlled } from '@/utils/useControlled';
import { OTPFieldRootContext } from './OTPFieldRootContext';
import { normalizeOTPValue, type OTPValidationType } from '../utils/otp';

/**
 * Groups all parts of the OTP field.
 * Doesn't render its own HTML element.
 *
 * actview 简化：无隐藏 validation input 与 form 联动；
 * 焦点队列（queueFocusInput）未迁移。
 */
export const OTPFieldRoot = defineComponent(function OTPFieldRoot(props: OTPFieldRoot.Props) {
  const {
    length = 4,
    defaultValue = '',
    value: valueProp,
    validationType = 'numeric',
    onValueChange,
    disabled = false,
    readOnly = false,
    required = false,
    invalid = false,
    mask = false,
    autoComplete = 'one-time-code',
    children,
  } = props as any;

  const [valueState, setValueState] = useControlled<string>({
    controlled: valueProp,
    default: defaultValue,
    name: 'OTPFieldRoot',
    state: 'value',
  });

  const value = ref(valueState.value);
  watch(
    () => valueState.value,
    (v) => {
      value.value = normalizeOTPValue(v, length, validationType);
    },
    {immediate: true},
  );

  const activeIndex = ref(-1);
  const inputId = useId();

  const setValue = (nextValue: string) => {
    const normalized = normalizeOTPValue(nextValue, length, validationType);
    value.value = normalized;
    setValueState(normalized);
    onValueChange?.(normalized, {value: normalized});
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

  const contextValue = {
    valueRef: value,
    activeIndexRef: activeIndex,
    value: value.value ?? '',
    setValue,
    activeIndex: activeIndex.value,
    setActiveIndex: (index: number) => (activeIndex.value = index),
    length,
    disabled,
    readOnly,
    required,
    invalid,
    mask,
    inputMode: validationType === 'none' ? 'text' : 'numeric',
    validationType,
    inputId,
    focusInput,
    handleInputFocus,
    handleInputBlur,
  };

  const filled = computed(() => (value.value ?? '') !== '');
  const focused = computed(() => activeIndex.value !== -1);
  const complete = computed(() => (value.value ?? '').length === length);

  const state = (): OTPFieldRootState => ({
    complete: complete.value,
    disabled,
    filled: filled.value,
    focused: focused.value,
    length,
    readOnly,
    required,
    value: value.value ?? '',
    validationType,
  });

  return () => {
    // actview 的 toValue 会对函数值直接调用（ref.ts 语义），render prop 需先检测。
    const child = typeof children === 'function' ? children : toValue(children);
    const context = {...contextValue, value: value.value ?? '', activeIndex: activeIndex.value};

    return (
      <OTPFieldRootContext.Provider value={context as any}>
        {typeof child === 'function' ? child(state()) : child}
      </OTPFieldRootContext.Provider>
    );
  };
});

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
