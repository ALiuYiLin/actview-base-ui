import { createContext } from 'actview';
import type { OTPValidationType } from '../utils/otp';

/**
 * store-as-is getter 载体契约：字段在 Provider setup 一次性实现为 getter，
 * 消费端读字段即求值（值字段实时；handlers/ids 为稳定引用）。
 */
export interface OTPFieldRootContextValue {
  value: string;
  activeIndex: number;
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
  autoComplete: string | undefined;
  inputId: string;
  focusInput: (index: number) => void;
  handleInputFocus: (index: number) => void;
  handleInputBlur: () => void;
}

export const OTPFieldRootContext = createContext<OTPFieldRootContextValue | undefined>(undefined);

export function useOTPFieldRootContext(optional = true): OTPFieldRootContextValue | undefined {
  const context = OTPFieldRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <OTPField.Root> is missing.');
  }
  return context;
}
