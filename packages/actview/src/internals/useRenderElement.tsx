import { unref } from 'actview';
import type { Ref } from '@actview/core';
import { jsx, createElement, type ComponentType, type VNode } from '@actview/jsx';
import { mergeRefsN } from '@base-ui/actview-utils/useMergedRefs';
import { mergeObjects } from '@base-ui/actview-utils/mergeObjects';
import { warn } from '@base-ui/actview-utils/warn';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { BaseUIComponentProps, ComponentRenderFn, HTMLProps, RefValue } from './types';
import { getStateAttributesProps, StateAttributesMapping } from './getStateAttributesProps';
import { resolveClassName } from '../utils/resolveClassName';
import { resolveStyle } from '../utils/resolveStyle';
import { mergeProps, mergePropsN, mergeClassNames } from '../merge-props';

type IntrinsicTagName = keyof JSX.IntrinsicElements;

/**
 * Renders a Base UI element.
 *
 * Unlike the React version (which returns an element during render), this returns a
 * **getter function** that must be invoked inside JSX. The getter re-evaluates the
 * render prop, state attributes, className/style resolution and props merging on every
 * call, so reactive values read during evaluation re-render the caller's render function.
 *
 * @param element The default HTML element to render. Can be overridden by the `render` prop.
 * @param componentProps An object containing the `render` and `className` props to be used for element customization. Other props are ignored.
 * @param params Additional parameters for rendering the element.
 */
export function useRenderElement<
  State extends Record<string, any>,
  RenderedElementType extends Element,
  TagName extends IntrinsicTagName | undefined,
  Enabled extends boolean | undefined = undefined,
>(
  element: TagName,
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State, RenderedElementType, TagName, Enabled> = {},
): () => VNode | null {
  const getElement = () => {
    if (params.enabled === false) {
      return null;
    }

    const state = (unref(params.state) ?? EMPTY_OBJECT) as State;
    const outProps = computeRenderElementProps(componentProps, params, state);
    return evaluateRenderProp(element, componentProps.render, outProps, state);
  };

  return getElement;
}

/**
 * Computes render element final props.
 */
function computeRenderElementProps<
  State extends Record<string, any>,
  RenderedElementType extends Element,
  TagName extends IntrinsicTagName | undefined,
>(
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State, RenderedElementType, TagName, any>,
  state: State,
): HTMLProps & { ref?: RefValue } {
  const { className: classNameProp, style: styleProp, render: renderProp } = componentProps;

  const { ref, props, stateAttributesMapping, enabled = true } = params;

  const className = enabled ? resolveClassName(classNameProp, state) : undefined;
  const style = enabled ? resolveStyle(styleProp, state) : undefined;

  const stateProps = enabled ? getStateAttributesProps(state, stateAttributesMapping) : EMPTY_OBJECT;

  const resolvedProps =
    enabled && props ? resolveRenderFunctionProps<TagName>(props) : undefined;

  // Ensure outProps is always a new mutable object when enabled, never EMPTY_OBJECT.
  // This prevents potential TypeError when setting ref, className, or style properties,
  // since EMPTY_OBJECT is frozen and mutations would fail in strict mode.
  const outProps: HTMLProps = enabled ? (mergeObjects(stateProps, resolvedProps) ?? {}) : EMPTY_OBJECT;

  if (enabled) {
    const refs: RefValue[] = [outProps.ref, getRenderPropRef(renderProp)];

    if (Array.isArray(ref)) {
      refs.push(...ref);
    } else {
      refs.push(ref);
    }

    if (refs.some((item) => item != null)) {
      outProps.ref = mergeRefsN(refs);
    }
  }

  if (className !== undefined) {
    outProps.className = mergeClassNames(outProps.className, className);
  }

  if (style !== undefined) {
    outProps.style = mergeObjects(
      outProps.style as object | undefined,
      style as object | undefined,
    ) as string | Record<string, string | number> | undefined;
  }

  return outProps;
}

function resolveRenderFunctionProps<TagName extends IntrinsicTagName | undefined>(
  props: NonNullable<UseRenderElementParameters<any, any, TagName, any>['props']>,
): RenderFunctionProps<TagName> {
  if (Array.isArray(props)) {
    return mergePropsN(props) as RenderFunctionProps<TagName>;
  }

  return mergeProps(undefined, props) as RenderFunctionProps<TagName>;
}

/** Extracts the `ref` from a render-prop element (a VNode in ActView). */
function getRenderPropRef(render: UseRenderElementComponentProps<any>['render']): RefValue {
  if (render && typeof render !== 'function') {
    return (render as VNode).props?.ref;
  }
  return undefined;
}

const COMPONENT_IDENTIFIER_PATTERN = /^[A-Z][A-Za-z0-9$]*$/;
const LOWERCASE_CHARACTER_PATTERN = /[a-z]/;

function evaluateRenderProp<T extends ComponentType<any>, S>(
  element: IntrinsicTagName | undefined,
  render: BaseUIComponentProps<T, S>['render'],
  props: HTMLProps & { ref?: RefValue },
  state: S,
): VNode | null {
  if (render) {
    if (typeof render === 'function') {
      if (process.env.NODE_ENV !== 'production') {
        warnIfRenderPropLooksLikeComponent(render);
      }
      return render(props, state) ?? null;
    }

    const mergedProps = mergeProps(props as any, (render as VNode).props as any);

    mergedProps.ref = props.ref;

    return cloneVNode(render as VNode, mergedProps);
  }
  if (element) {
    if (typeof element === 'string') {
      return renderTag(element, props);
    }
  }
  // Unreachable, but the typings on `useRenderElement` need to be reworked
  // to annotate it correctly.
  throw new Error('Base UI: Render element or function are not defined.');
}

/** ActView equivalent of `React.cloneElement`: creates a VNode of the same type with merged props. */
function cloneVNode(vnode: VNode, props: Record<string, any>): VNode {
  return createElement(vnode.type, { ...(vnode.props ?? {}), ...props });
}

function warnIfRenderPropLooksLikeComponent(renderFn: { name: string }) {
  const functionName = renderFn.name;
  if (functionName.length === 0) {
    return;
  }

  if (!COMPONENT_IDENTIFIER_PATTERN.test(functionName)) {
    return;
  }

  if (!LOWERCASE_CHARACTER_PATTERN.test(functionName)) {
    return;
  }

  warn(
    `The \`render\` prop received a function named \`${functionName}\` that starts with an uppercase letter.`,
    'This usually means a component was passed directly as `render={Component}`.',
    'Base UI calls `render` as a plain function, which can break setup semantics.',
    'If this is an intentional render callback, rename it to start with a lowercase letter.',
    'Use `render={<Component />}` or `render={(props) => <Component {...props} />}` instead.',
    'https://base-ui.com/r/invalid-render-prop',
  );
}

function renderTag(Tag: string, props: Record<string, any>) {
  const { children, ...attrs } = props;
  // Use `jsx` instead of `createElement` for string tags so that `children`
  // from props are correctly processed as child VNodes rather than set as a DOM attribute.
  // (`createElement` for string types does not handle children at all — only `jsx` does.)
  return children != null ? jsx(Tag, { ...attrs, children }) : jsx(Tag, attrs);
}

/**
 * Props accepted for the rendered element. Kept as the loose `HTMLProps` bag (with an index
 * signature) because ActView event handler types are contravariant function properties, so
 * `WithBaseUIEvent`-wrapped handlers are not assignable to the plain intrinsic element types.
 */
type RenderFunctionProps<TagName> = HTMLProps;

export type UseRenderElementParameters<
  State,
  RenderedElementType extends Element,
  TagName,
  Enabled extends boolean | undefined,
> = {
  /**
   * If `false`, the hook will skip most of its internal logic and return `null`.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: Enabled | undefined;
  /**
   * @deprecated
   */
  propGetter?: ((externalProps: HTMLProps) => HTMLProps) | undefined;
  /**
   * The ref to apply to the rendered element.
   */
  ref?: RefValue<RenderedElementType> | (RefValue<RenderedElementType> | undefined)[] | undefined;
  /**
   * The state of the component. May be a ref (e.g. a `computed`) — it is unwrapped at evaluation time.
   */
  state?: State | Ref<State> | undefined;
  /**
   * Intrinsic props to be spread on the rendered element.
   */
  props?:
    | RenderFunctionProps<TagName>
    | Array<
        | RenderFunctionProps<TagName>
        | undefined
        | ((props: RenderFunctionProps<TagName>) => RenderFunctionProps<TagName>)
      >
    | undefined;
  /**
   * A mapping of state to `data-*` attributes.
   */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
};

export interface UseRenderElementComponentProps<State> {
  /**
   * The class name to apply to the rendered element.
   * Can be a string or a function that accepts the state and returns a string.
   */
  className?: string | ((state: State) => string | undefined) | undefined;
  /**
   * The render prop or VNode to override the default element.
   */
  render?: undefined | VNode | ComponentRenderFn<HTMLProps, State>;
  /**
   * The style to apply to the rendered element.
   * Can be a style object or a function that accepts the state and returns a style object.
   */
  style?:
    | string
    | Record<string, string | number>
    | ((state: State) => string | Record<string, string | number> | undefined)
    | undefined;
}

export interface UseRenderElementState {}
