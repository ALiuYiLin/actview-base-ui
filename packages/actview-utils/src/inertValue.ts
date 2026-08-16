/**
 * ActView has no framework-level inert compatibility layer, so the native boolean
 * value is passed through directly.
 */
export function inertValue(value?: boolean): boolean | undefined {
  return value;
}
