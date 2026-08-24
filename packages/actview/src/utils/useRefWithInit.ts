import { ref } from 'actview';
import type { Ref } from 'actview';

/**
 * Creates a ref initialized lazily via the factory, exactly once.
 * (actview 版：返回 `Ref<T>`——读写走 `.value`。)
 */
export function useRefWithInit<T>(initializer: () => T): Ref<T> {
  const box = ref<T | null>(null);
  if (box.value === null) {
    box.value = initializer();
  }
  return box as Ref<T>;
}
