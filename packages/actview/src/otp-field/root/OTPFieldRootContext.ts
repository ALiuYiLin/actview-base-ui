import { createContext } from 'actview';
import type { OTPValidationType } from '../utils/otp';

export interface OTPFieldRootContextValue {
  value: string;
  /**
   * actview 版：响应式 ref（context 对象本身非响应式，子组件读 ref 触发更新）。
   */
  valueRef: {value: string | undefined};
  activeIndex: number;
  activeIndexRef: {value: number};
  setValue: (value: string) => void;
  setActiveIndex: (index: number) => void;
  length: number;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  mask: boolean;
  inputMode: 'numeric' | 'text';
  validationType: OTPValidationType;
  inputId: string;
  focusInput: (index: number) => void;
  handleInputFocus: (index: number) => void;
  handleInputBlur: () => void;
}

export const OTPFieldRootContext = createContext<OTPFieldRootContextValue | undefined>(undefined);

export function useOTPFieldRootContext(optional = true): any {
  const context = OTPFieldRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <OTPField.Root> is missing.');
  }
  return context.value;
}
