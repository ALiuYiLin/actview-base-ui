import { createContext } from 'actview';

export interface NumberFieldScrubAreaContext {
  isPointerLockRef: {value: boolean};
  isScrubbing: boolean;
}

export const NumberFieldScrubAreaContext = createContext<NumberFieldScrubAreaContext | undefined>(
  undefined,
);

export function useNumberFieldScrubAreaContext(optional = true) {
  // store-as-is：use() 原样返回注入的 getter 载体。
  const context = NumberFieldScrubAreaContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <NumberField.ScrubArea> is missing.');
  }
  return context;
}