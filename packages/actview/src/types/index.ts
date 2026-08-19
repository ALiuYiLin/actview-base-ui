import type { HTMLAttributes, VNode } from '@actview/jsx';
import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../internals/createBaseUIEventDetails';

export type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../internals/createBaseUIEventDetails';

export type { VNode };

/**
 * A ref value accepted by Base UI component APIs: a callback ref, or an object with
 * a `current` (React style) or `value` (ActView style) property.
 */
export type RefValue<T = any> =
  | ((instance: T | null) => void)
  | { current?: T | null; value?: T | null }
  | null
  | undefined;

/**
 * Props to be spread on a rendered element.
 *
 * ActView's intrinsic event handler types are contravariant function properties, so
 * `WithBaseUIEvent`-wrapped handlers (from `BaseUIComponentProps`) are not assignable to them.
 * To mirror React's bivariant handler behavior, all `on*` keys are re-declared as a loose
 * template index, and a `string` index absorbs everything else.
 */
type HTMLAttributesEventKeys = Extract<keyof HTMLAttributes, `on${string}`>;

export type HTMLProps<T = any> = Omit<HTMLAttributes, HTMLAttributesEventKeys> & {
  className?: string | undefined;
  style?: string | Record<string, string | number> | undefined;
  ref?: RefValue<T> | undefined;
  [key: `on${string}`]: ((event: any) => any) | undefined;
  [key: string]: any;
};

/**
 * Shape of the render prop: a function that takes a single merged props object
 * (element props + component state + ref) and returns a VNode.
 *
 * ActView design: the component world is "single props object" everywhere —
 * component setup receives one props object, and the render prop likewise
 * receives one merged object. State is not a separate argument; it is merged
 * into props, so the headless component and the plain component share the same
 * mental model.
 *
 * @template RenderFunctionProps Props to be spread on the rendered element.
 * @template State Component's internal state, merged into the props object.
 */
export type ComponentRenderFn<RenderFunctionProps, State> = (
  props: RenderFunctionProps & State & { ref?: RefValue },
) => VNode | null | undefined;

export type BaseUIEvent<E extends Event> = E & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};
