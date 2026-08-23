export * as OTPField from './index.parts';

export type * from './root/OTPFieldRoot';
export type * from './input/OTPFieldInput';

export { normalizeOTPValue, removeOTPCharacter, replaceOTPValue } from './utils/otp';
export type { OTPValidationType } from './utils/otp';
