import type { VNode, HTMLAttributes } from '@actview/jsx';
import type { Ref } from 'actview';

/**
 * HTML attributes accepted by ActView DOM elements.
 * Alias of `@actview/jsx`'s `HTMLAttributes` so library code does not depend
 * on the JSX package directly.
 */
export type HTMLProps = HTMLAttributes;

/**
 * A ref value compatible with ActView template refs
 * (`ref()` / `useRootElement()` — read via `.value`).
 */
export type RefValue = Ref<any>;

/**
 * The `render` prop function signature.
 *
 * ActView components receive a single props object everywhere — setup, render,
 * and render props — so the render function gets one object that merges the
 * element props, the component state, and the root ref (case 2 in MIGRATION.md).
 */
export type ComponentRenderFn<RenderFunctionProps, State> = (
  props: RenderFunctionProps & State & { ref?: RefValue },
) => VNode | null | undefined;
