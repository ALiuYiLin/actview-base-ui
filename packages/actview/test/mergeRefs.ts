import type { RefValue } from '../src/types';

export function mergeRefs<T>(...refs: RefValue<T>[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        if ('current' in ref) {
          ref.current = value;
        } else if ('value' in ref) {
          ref.value = value;
        }
      }
    });
  };
}
