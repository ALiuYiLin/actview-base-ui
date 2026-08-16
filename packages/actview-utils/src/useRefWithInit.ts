/**
 * A ref initialization that accepts a function and an optional initialization argument.
 *
 * In ActView the component setup runs only once, so the lazy `React.useRef` initialization
 * pattern collapses to a plain eager call. The `{ current }` shape is kept for API compatibility
 * with the React version.
 *
 * @usage
 *   const ref = useRefWithInit(sortColumns, columns)
 */
export function useRefWithInit<T>(init: () => T): { current: T };
export function useRefWithInit<T, U>(init: (arg: U) => T, initArg: U): { current: T };
export function useRefWithInit(init: (arg?: unknown) => unknown, initArg?: unknown) {
  const current = init(initArg);
  return { current };
}
