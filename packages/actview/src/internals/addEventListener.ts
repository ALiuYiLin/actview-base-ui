/**
 * Adds an event listener and returns a cleanup function to remove it.
 * (本地实现：等价于 @base-ui/utils/addEventListener。)
 */
export function addEventListener<
  Target extends EventTarget,
  Type extends string,
>(target: Target, type: Type, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): () => void {
  target.addEventListener(type, listener as EventListener, options);
  return () => {
    target.removeEventListener(type, listener as EventListener, options);
  };
}
