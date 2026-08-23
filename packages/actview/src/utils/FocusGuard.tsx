import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import type { HTMLProps, RefValue } from '@/internals/types';

/**
 * Renders an invisible focus guard `<span>`.
 *
 * This is a plain render function rather than a component: ActView component refs resolve to the
 * component instance, not the DOM element (mountComponent deletes `props.ref`), so a component
 * cannot forward a ref to its inner element. Callers pass a DOM ref directly.
 *
 * @internal
 */
export function renderFocusGuard(
  props: HTMLProps,
  ref: RefValue<HTMLSpanElement> | undefined,
) {
  return (
    <span
      {...props}
      ref={ref}
      style={visuallyHidden}
      aria-hidden={true}
      tabIndex={0}
      data-base-ui-focus-guard=""
    />
  );
}
