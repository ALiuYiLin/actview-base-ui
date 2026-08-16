/**
 * Runs `fn` once, during the first setup of the component.
 *
 * In ActView the component setup executes exactly once, so this is equivalent to calling
 * the function directly.
 */
export function useOnFirstRender(fn: Function) {
  fn();
}
