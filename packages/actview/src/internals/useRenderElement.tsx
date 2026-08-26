import { toValue } from 'actview';
import type { Ref } from 'actview';
import type { MaybeRefOrGetter } from '@/types';
import {
  getStateAttributesProps,
  type StateAttributesMapping,
} from '@/internals/getStateAttributesProps';
import type { HTMLProps } from '@/internals/types';

/**
 * 统一的"合并 props + 渲染元素"工具（内部）。
 *
 * 吸收全库各组件手写重复的模式：
 * 1. props 数组合并（`for (const prop of props) Object.assign(merged, prop)`，
 *    函数元素接收已合并的 merged——useButton 保留外部 role 的语义）；
 * 2. state → data-* 属性（`getStateAttributesProps`，配合 `stateAttributesMapping`）；
 * 3. className / style 的函数形式调用（`(state) => value`）；
 * 4. render prop 渲染：函数形式（单参 `{...merged, ...state, ref}`——
 *    全库 177 处统一签名）或元素对象形式（className/style 合并）；
 * 5. refs 合并（函数 / ref 对象数组 → mergedRefs）。
 *
 * 无状态纯函数：`merged()` / `element()` 每次调用即时计算——响应性由渲染
 * effect 内的 `toValue` 读取保证（裸函数组件与 defineComponent 组件均可
 * 在 setup 或渲染函数内调用本 hook）。
 */
export function useRenderElement<State extends Record<string, any>>(
  options: UseRenderElementOptions<State>,
): {
  /** 合并后的元素 props（每次调用即时计算）。 */
  merged: () => HTMLProps;
  /** 渲染最终元素：render 分支（函数 / 元素对象）或默认 Tag（含 children / refs）。 */
  element: (
    extraRefs?: Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>>,
  ) => any;
} {
  const getState = () => toValue(options.state) ?? ({} as State);

  const merged = (): HTMLProps => {
    const m: HTMLProps = {};
    for (const prop of toValue(options.props) ?? []) {
      const resolved = typeof prop === 'function' ? prop(m) : prop;
      if (resolved) {
        Object.assign(m, resolved);
      }
    }
    if (options.stateAttributesMapping) {
      Object.assign(m, getStateAttributesProps(getState(), options.stateAttributesMapping));
    }
    const cls = toValue(options.className);
    if (typeof cls === 'function') {
      m.className = cls(getState());
    } else if (cls !== undefined) {
      m.className = cls;
    }
    const st = toValue(options.style);
    if (typeof st === 'function') {
      m.style = st(getState());
    } else if (st !== undefined) {
      m.style = typeof st === 'object' ? cleanStyle(st) : st;
    }
    return m;
  };

  const element = (
    extraRefs?: Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>>,
  ) => {
    const mergedRefs = (el: HTMLElement | null) => {
      const refs = [...(toValue(options.refs) ?? []), ...(extraRefs ?? [])];
      for (const r of refs) {
        const resolved =
          typeof r === 'function' ? r : (element: HTMLElement | null) => (r.value = element);
        resolved(el);
      }
    };

    const renderValue = toValue(options.render);
    if (renderValue) {
      if (typeof renderValue === 'function') {
        const renderFunctionProps = {...merged(), ...getState()};
        if (options.refToRender !== false) {
          renderFunctionProps.ref = mergedRefs;
        }
        return renderValue(renderFunctionProps as any);
      }
      const m = merged();
      const renderProps = renderValue.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = renderValue.type as any;
      const mergedRenderProps = Object.assign({}, m, restRenderProps);
      mergedRenderProps.className =
        typeof m.className === 'string' && typeof renderClassName === 'string'
          ? `${m.className} ${renderClassName}`.trim()
          : (m.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, m.style, renderStyle);
      if (options.refToRender !== false) {
        return <Tag key={renderValue.key} {...mergedRenderProps} ref={mergedRefs} />;
      }
      return <Tag key={renderValue.key} {...mergedRenderProps} />;
    }

    const Tag = (toValue(options.defaultTag) ?? 'div') as any;
    return (
      <Tag {...merged()} ref={mergedRefs}>
        {toValue(options.children)}
      </Tag>
    );
  };

  return {merged, element};
}

export interface UseRenderElementOptions<State extends Record<string, any>> {
  /**
   * 合并源 props 数组：每个元素可为对象或函数（函数接收已合并的 merged，
   * 可读取/覆盖既有属性——`useButton` 保留外部 role 的语义）。
   */
  props?: MaybeRefOrGetter<
    Array<Record<string, any> | ((merged: Record<string, any>) => Record<string, any>)>
  >;
  /**
   * 状态：用于 data-* 属性（配合 `stateAttributesMapping`）、
   * className/style 函数调用与 render 函数展开。
   */
  state?: State | Ref<State | undefined> | (() => State | undefined) | undefined;
  /**
   * 状态 → data-* 属性映射；不传时**不**产生 data-* 属性。
   */
  stateAttributesMapping?: StateAttributesMapping<State>;
  className?: MaybeRefOrGetter<string | ((state: State) => string | undefined) | undefined>;
  style?: MaybeRefOrGetter<
    | string
    | Record<string, string | number>
    | ((state: State) => string | Record<string, string | number> | undefined)
    | undefined
  >;
  /**
   * render prop：函数（单参 `{...merged, ...state, ref}`）或元素对象。
   */
  render?: MaybeRefOrGetter<any>;
  /** 需要合并到最终元素上的 refs（函数 / ref 对象）。 */
  refs?: MaybeRefOrGetter<Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>>>;
  children?: MaybeRefOrGetter<any>;
  /** 默认渲染标签（无 render prop 时）。@default 'div' */
  defaultTag?: MaybeRefOrGetter<keyof JSX.IntrinsicElements | string | undefined>;
  /**
   * render 函数形式是否携带 `ref`（mergedRefs）。默认 true（全库组件
   * 均向 render 函数传 ref）；个别组件（如 CompositeRoot）原实现不带，
   * 传 `false` 保持行为。
   * @default true
   */
  refToRender?: boolean | undefined;
}

/** 剔除样式对象里的 undefined 值（Object.assign 合并会产生——DOM style 语义上无 undefined）。 */
function cleanStyle(style: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) {
      out[key] = value as string | number;
    }
  }
  return out;
}
