import type { StyleValue } from '../internals/types';

/**
 * If the provided style is an object, it will be returned as is.
 * Otherwise, the function will call the style function with the state as the first argument.
 *
 * @param style
 * @param state
 */
export function resolveStyle<State>(
  style: StyleValue | ((state: State) => StyleValue | undefined) | undefined,
  state: State,
) {
  return typeof style === 'function' ? style(state) : style;
}
