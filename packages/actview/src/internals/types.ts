import type { VNode, HTMLAttributes } from '@actview/jsx';
import type { Ref } from 'actview';
import type { BaseUIEvent, ComponentRenderFn, HTMLProps, MaybeRefOrGetter } from '../types';

export type { HTMLProps, ComponentRenderFn, BaseUIEvent, MaybeRefOrGetter };

export interface FloatingUIOpenChangeDetails {
  open: boolean;
  reason: string;
  nativeEvent: Event;
  nested: boolean;
  triggerElement?: Element | undefined;
}

export type Orientation = 'horizontal' | 'vertical';

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

/**
 * Props shared by all Base UI components.
 * Contains `className` (string or callback taking the component's state as an argument)
 * and `render` (function or VNode to customize rendering).
 *
 * 宿主属性基座为 `HTMLAttributes`（含 children/id/aria-* 等；注意：@actview/jsx 的
 * `JSX.IntrinsicElements[Tag]` 反而不含这些键，勿改用其作基座）；`ref` 重新声明为
 * 转发引用（React 19 形态：ref-as-prop）。
 */
export interface BaseUIComponentProps<
  ElementType extends keyof JSX.IntrinsicElements,
  State,
  RenderFunctionProps = HTMLProps,
> extends Omit<HTMLAttributes, 'className' | 'style' | 'ref'> {
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
  style?:
    | string
    | Record<string, string | number>
    | ((state: State) => string | Record<string, string | number> | undefined)
    | undefined;
  /**
   * 转发用根元素引用（使用方 `<Comp ref={x}/>` 经 props.ref 到达——React 19 形态）。
   * actview 契约：组件 ref 默认收到**组件实例**（设计语义）；把本 ref 绑定到
   * 根元素（或经 useRenderElement 的 params.ref 透传）即转发最终根 DOM。
   */
  ref?: Ref<HTMLElement | null>;
}
