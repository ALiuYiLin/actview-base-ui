import { computed, ref, toValue } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { MaybeRefOrGetter } from '../types';

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

/**
 * Controlled/uncontrolled state management.
 * (actview 版：React useState + useEffect 警告 → ref + computed。
 * 受控模式在 setup 时快照（React 版 isControlled 用 useRef 同样只取首次），
 * 受控时返回受控值、非受控时返回内部 state；setValue 只在非受控时写入。)
 */
export function useControlled<T = unknown>(
  props: UseControlledProps<T>,
): [ComputedRef<T | undefined>, (value: T | undefined) => void] {
  const isControlled = toValue(props.controlled) !== undefined;
  const valueState = ref<T | undefined>(toValue(props.default)) as Ref<T | undefined>;

  const value = computed(() => {
    const controlledValue = toValue(props.controlled);
    return isControlled && controlledValue !== undefined ? controlledValue : valueState.value;
  });

  const setValue = (newValue: T | undefined) => {
    if (!isControlled) {
      valueState.value = newValue;
    }
  };

  return [value, setValue];
}
