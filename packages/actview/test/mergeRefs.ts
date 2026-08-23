import type { RefValue } from '../src/types';

type FunctionRef = (value: unknown) => void;

export function mergeRefs<T>(...refs: (RefValue | FunctionRef)[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        ref.value = value;
      }
    });
  };
}
