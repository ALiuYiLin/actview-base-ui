import { ref } from 'actview';

/**
 * Creates a ref initialized lazily via the factory, exactly once.
 * (actview 版：setup 期执行工厂，返回 {current} 普通对象——非响应式。)
 */
export function useRefWithInit<T>(initializer: () => T): {current: T} {
  const valueRef = ref<T | null>(null) as unknown as {current: T | null};
  if (valueRef.current === null) {
    (valueRef as any).current = initializer();
  }
  return valueRef as {current: T};
}
