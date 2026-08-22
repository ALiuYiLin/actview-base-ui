import type { RefValue } from '../src/types';
import { FunctionRef } from '@actview/core';

export function mergeRefs<T>(...refs: (RefValue | FunctionRef)[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else {
        ref.value = value;
      }
    });
  };
}
