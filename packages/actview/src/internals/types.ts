import type { Ref } from '@actview/core';
import type { ComponentType, PropsOf as JSXPropsOf, VNode } from '@actview/jsx';
import type {
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
  RefValue,
} from '@/types';

export type { HTMLProps, BaseUIEvent, ComponentRenderFn, RefValue, VNode };

/**
 * Internal mutable object ref, mirroring `React.RefObject` / `React.MutableRefObject`.
 * ActView internal refs keep this `{ current }` shape (see `useRefWithInit`), unlike
 * DOM refs which use callback refs or `{ value }` objects.
 */
export type RefObject<T> = { current: T };

/**
 * A value that may be a plain value or an ActView `ref` (including `ComputedRef`,
 * which extends `Ref`). Reactive hook parameters use this so getters/effects can
 * `unref` them and re-evaluate as the source changes.
 */
export type MaybeRef<T> = T | Ref<T>;

export type MaybeBaseUIEvent<E extends Event> = E &
  Partial<Pick<BaseUIEvent<E>, 'preventBaseUIHandler' | 'baseUIHandlerPrevented'>>;

export interface FloatingUIOpenChangeDetails {
  open: boolean;
  reason: string;
  nativeEvent: Event;
  nested: boolean;
  triggerElement?: Element | undefined;
}

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

/** Style value accepted by ActView DOM elements. */
export type StyleValue = string | Record<string, string | number>;

type ElementPropsOf<ElementType> = ElementType extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[ElementType]
  : JSXPropsOf<ElementType>;

/**
 * Props shared by all Base UI components.
 * Contains `className` (string or callback taking the component's state as an argument) and `render` (function to customize rendering).
 */
export type BaseUIComponentProps<
  ElementType extends keyof JSX.IntrinsicElements | ComponentType<any>,
  State,
  RenderFunctionProps = HTMLProps,
> = Omit<
  WithBaseUIEvent<ElementPropsOf<ElementType> & { ref?: RefValue }>,
  'className' | 'color' | 'defaultValue' | 'defaultChecked' | 'style'
> & {
  /**
   * CSS class applied to the element, or a function that
   * returns a class based on the component's state.
   */
  className?: string | ((state: State) => string | undefined) | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a `VNode` or a function that returns the element to render.
   */
  render?: VNode | ComponentRenderFn<RenderFunctionProps, State> | undefined;
  /**
   * Style applied to the element, or a function that
   * returns a style object based on the component's state.
   */
  style?: StyleValue | ((state: State) => StyleValue | undefined) | undefined;
};

export interface NativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (for example, `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
}

export interface NonNativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `true` if the rendered element is a native button.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

/**
 * Simplifies the display of a type (without modifying it).
 * Taken from https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Simplify<T> = T extends Function ? T : { [K in keyof T]: T[K] };

/**
 * Makes specified keys in a type required.
 *
 * @template T - The original type.
 * @template K - The keys to make required.
 */
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

export type Orientation = 'horizontal' | 'vertical';
