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

/**
 * A DOM event augmented with the Base UI handler-prevention mechanism
 * (mirrors the React `BaseUIEvent`: `preventBaseUIHandler()` / `baseUIHandlerPrevented`).
 * ActView events are native DOM events, so `E` is a DOM event type.
 */
export type BaseUIEvent<E> = E & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};

export type MaybeBaseUIEvent<E extends Event> = E &
  Partial<Pick<BaseUIEvent<E>, 'preventBaseUIHandler' | 'baseUIHandlerPrevented'>>;

/**
 * A value, a ref to a value, or a getter that produces a value
 * (accepted by `toValue` — mirrors Vue's `MaybeRefOrGetter`).
 */
export type MaybeRefOrGetter<T> = T | Ref<any> | (() => T);

type WithPreventBaseUIHandler<T> = T extends (event: infer E) => any
  ? E extends Event
    ? (event: BaseUIEvent<E>) => ReturnType<T>
    : T
  : T extends undefined
    ? undefined
    : T;

/**
 * Adds a `preventBaseUIHandler` method to all event handlers.
 */
export type WithBaseUIEvent<T> = {
  [K in keyof T]: WithPreventBaseUIHandler<T[K]>;
};
