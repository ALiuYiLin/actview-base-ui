import { computed, ref, toValue, watch } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { error } from './error';

type MaybeRefOrGetter<T> = T | Ref<T> | (() => T);

export interface UseControlledProps<T = unknown> {
  /**
   * Holds the component value when it's controlled.
   */
  controlled: MaybeRefOrGetter<T | undefined>;
  /**
   * The default value when uncontrolled, and the fallback if a controlled value later becomes `undefined`.
   */
  default: MaybeRefOrGetter<T | undefined>;
  /**
   * The component name displayed in warnings.
   */
  name: string;
  /**
   * The name of the state variable displayed in warnings.
   */
  state?: string | undefined;
}

export type UseControlledResult<T = unknown> = ComputedRef<T | undefined> & {
  setValueIfUncontrolled: (newValue: T | undefined) => void;
};

/**
 * Returns a computed ref holding the current value, plus a setter that only
 * writes when the component is uncontrolled.
 */
export function useControlled<T = unknown>({
  controlled,
  default: defaultProp,
  name,
  state = 'value',
}: UseControlledProps<T>): UseControlledResult<T> {
  // isControlled is determined once at setup; it never changes.
  const isControlled = toValue(controlled) !== undefined;
  const valueState = ref(toValue(defaultProp));

  // Keep the initial mode, but use the initial default if a controlled value disappears.
  // This preserves the defined-default behavior while the mode-switch warning is emitted below.
  const value = computed<T | undefined>(() =>
    isControlled && toValue(controlled) !== undefined ? toValue(controlled) : valueState.value,
  );

  const setValueIfUncontrolled = (newValue: T | undefined) => {
    if (!isControlled) {
      valueState.value = newValue;
    }
  };

  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => toValue(controlled) !== undefined,
      (now, prev) => {
        if (prev !== now) {
          error(
            [
              `A component is changing the ${
                isControlled ? '' : 'un'
              }controlled ${state} state of ${name} to be ${isControlled ? 'un' : ''}controlled.`,
              'Elements should not switch from uncontrolled to controlled (or vice versa).',
              `Decide between using a controlled or uncontrolled ${name} ` +
                'element for the lifetime of the component.',
              "The nature of the state is determined during the first render. It's considered controlled if the value is not `undefined`.",
              'More info: https://fb.me/react-controlled-components',
            ].join('\n'),
          );
        }
      },
    );

    const defaultValue = toValue(defaultProp);

    watch(
      () => toValue(defaultProp),
      () => {
        if (
          !isControlled &&
          serializeToDevModeString(defaultValue) !== serializeToDevModeString(toValue(defaultProp))
        ) {
          error(
            [
              `A component is changing the default ${state} state of an uncontrolled ${name} after being initialized. ` +
                `To suppress this warning opt to use a controlled ${name}.`,
            ].join('\n'),
          );
        }
      },
    );
  }

  return Object.assign(value, { setValueIfUncontrolled });
}

function serializeToDevModeString(input: unknown) {
  let nextId = 0;
  const seen = new WeakMap<object, number>();

  try {
    const result = JSON.stringify(input, function replacer(key, value) {
      if (key === '_owner' && this != null && typeof this === 'object' && '$$typeof' in this) {
        return undefined;
      }

      if (typeof value === 'bigint') {
        return `__bigint__:${value}`;
      }

      if (value !== null && typeof value === 'object') {
        const id = seen.get(value);
        if (id !== undefined) {
          return `__object__:${id}`;
        }

        seen.set(value, nextId);
        nextId += 1;
      }

      return value;
    });

    return result ?? `__top__:${typeof input}`;
  } catch {
    return '__unserializable__';
  }
}
