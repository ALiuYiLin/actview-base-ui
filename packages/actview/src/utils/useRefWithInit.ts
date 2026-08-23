/**
 * Creates a ref initialized lazily via the factory, exactly once.
 * (actview 版：返回 {current} 普通对象——非响应式。)
 */
export function useRefWithInit<T>(initializer: () => T): {current: T} {
  const box: {current: T | null} = {current: null};
  if (box.current === null) {
    box.current = initializer();
  }
  return box as {current: T};
}
