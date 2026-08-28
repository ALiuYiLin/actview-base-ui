// ============================================================
// useRenderElement —— 统一"合并 props + 渲染元素"工具（新契约）
// 签名: useRenderElement(element, componentProps, params) → VNode
// 与旧版（useRenderElementLegacy.tsx，options → {merged, element}）的差异:
//   1. 直接收默认标签 + 组件 props（render/className/style）+ params，
//      内部完成 state→data-* 映射、className/style 求值、props 数组归并
//      （getter 整体替换语义）、ref 合并链与 render 双形态分发
//   2. render 函数形态: (props, state) 双参——props 为合并后的元素 props
//      （含 useMergedRefs 合并链 ref），state 为第二参
//   3. render VNode 形态: clone 合并（重建 _jsx(type, mergedProps, key)），
//      Base UI 展开顺序（render 自带 props 为右侧，仅 ref 用合并链）
// 渲染期调用约定: 组件体末尾以 <>{useRenderElement(...)}</> 收尾——
// 字面 Fragment 是 babel 插件判定的 JSX 锚，helper 调用保持逐渲染求值。
// ============================================================

import { jsx as _jsx } from '@actview/jsx'
import type {
  BaseUIComponentProps,
  ComponentRenderFn,
  HTMLProps,
} from './types'
import {
  getStateAttributesProps,
  type StateAttributesMapping,
} from './getStateAttributesProps'
import { resolveClassName, resolveStyle } from './utils/resolveClassNameStyle'
import { mergeClassNames, mergeProps, mergePropsN } from './mergeProps'
import { useMergedRefs } from './useMergedRefs'
import { mergeObjects } from './utils/mergeObjects'
import { getReactElementRef } from './utils/getReactElementRef'

type IntrinsicTagName = keyof JSX.IntrinsicElements

const DEV = (import.meta as any)?.env?.DEV !== false
const COMPONENT_IDENTIFIER_PATTERN = /^[A-Z][A-Za-z0-9$]*$/
const LOWERCASE_CHARACTER_PATTERN = /[a-z]/

export interface UseRenderElementParameters<State> {
  /** false 时跳过渲染直接返回 null（条件渲染用） */
  enabled?: boolean | undefined
  /** 要施加到渲染元素上的 ref（可数组,useMergedRefs 合并） */
  ref?:
    | { value: any }
    | ((v: any) => void)
    | ({ value: any } | ((v: any) => void) | null | undefined)[]
    | undefined
  /** 组件内部状态 */
  state?: State | undefined
  /** 展开在渲染元素上的宿主 props（数组形态按序归并,右侧覆盖） */
  props?:
    | Record<string, any>
    | Array<Record<string, any> | ((prev: any) => any) | undefined>
    | undefined
  /** state → data-* 属性的逐键自定义映射 */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined
}

export interface UseRenderElementComponentProps<State> {
  className?: string | ((state: State) => string | undefined) | undefined
  render?: JSX.Element | ComponentRenderFn<HTMLProps, State> | undefined
  style?:
    | string
    | Record<string, any>
    | ((state: State) => Record<string, any> | undefined)
    | undefined
}

/** 计算 render 元素的最终 props（state attrs → params.props → className/style → ref 合并链） */
function useRenderElementProps<State extends Record<string, any>>(
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State> = {},
): Record<string, any> {
  const {
    className: classNameProp,
    style: styleProp,
    render: renderProp,
  } = componentProps

  const {
    state = {} as State,
    ref,
    props,
    stateAttributesMapping,
    enabled = true,
  } = params

  const className = enabled ? resolveClassName(classNameProp, state) : undefined
  const style = enabled ? resolveStyle(styleProp, state) : undefined

  const stateProps = enabled
    ? getStateAttributesProps(state, stateAttributesMapping)
    : {}

  const resolvedProps =
    enabled && props ? resolveRenderFunctionProps(props) : undefined

  const outProps: Record<string, any> = enabled
    ? (mergeObjects(stateProps, resolvedProps) ?? {})
    : {}

  // ref 合并链：既有 outProps.ref（一般来自 params.props 数组）+ render 节点自带
  // ref + 转发 ref —— 写入时广播全部
  if (enabled) {
    outProps.ref = useMergedRefs(
      outProps.ref,
      getReactElementRef(renderProp),
      ref as any,
    )
  }

  if (!enabled) return outProps

  if (className !== undefined) {
    outProps.className = mergeClassNames(outProps.className, className)
  }

  if (style !== undefined) {
    outProps.style = mergeObjects(outProps.style as any, style)
  }

  return outProps
}

function resolveRenderFunctionProps(
  props: NonNullable<UseRenderElementParameters<any>['props']>,
): Record<string, any> {
  if (Array.isArray(props)) {
    return mergePropsN(props)
  }
  return mergeProps(undefined, props)
}

function evaluateRenderProp<S extends Record<string, any>>(
  element: IntrinsicTagName | undefined,
  render: BaseUIComponentProps<IntrinsicTagName, S>['render'],
  props: Record<string, any>,
  state: S,
): any {
  if (render) {
    if (typeof render === 'function') {
      if (DEV) warnIfRenderPropLooksLikeComponent(render as any)
      return (render as any)(props, state)
    }

    // 节点形态 = cloneElement(mergeProps(props, render.props), ref 覆盖为合并链,
    // key 透传)。注意展开顺序:render 自带 props 为右侧（覆盖出口 props）,
    // 仅 ref 强制使用合并链。
    const node = render as JSX.Element
    const mergedProps = mergeProps(props, node.props)
    mergedProps.ref = props.ref
    return _jsx(node.type as any, mergedProps, node.key ?? undefined)
  }
  if (element) {
    if (typeof element === 'string') {
      return renderTag(element, props)
    }
  }
  throw new Error('Base UI: Render element or function are not defined.')
}

function warnIfRenderPropLooksLikeComponent(renderFn: { name?: string }) {
  const functionName = renderFn.name ?? ''
  if (functionName.length === 0) return
  if (!COMPONENT_IDENTIFIER_PATTERN.test(functionName)) return
  if (!LOWERCASE_CHARACTER_PATTERN.test(functionName)) return
  console.warn(
    `The \`render\` prop received a function named \`${functionName}\` that starts with an uppercase letter.`,
    'This usually means a component was passed directly as `render={Component}`.',
    'Render props are called as plain functions; use `render={<Component />}` or `render={(props) => <Component {...props} />}` instead.',
  )
}

function renderTag(Tag: string, props: Record<string, any>) {
  if (Tag === 'button') {
    return _jsx('button', { type: 'button', ...props }, props.key ?? undefined)
  }
  if (Tag === 'img') {
    return _jsx('img', { alt: '', ...props }, props.key ?? undefined)
  }
  return _jsx(Tag, props, props.key ?? undefined)
}

/**
 * 渲染一个 Base UI 风格元素。
 *
 * @param element 默认 HTML 标签;可被 render prop 接管
 * @param componentProps 含 render/className/style 的完整组件 props
 * @param params { state, ref, props, stateAttributesMapping, enabled }
 */
export function useRenderElement<
  State extends Record<string, any>,
  TagName extends IntrinsicTagName | undefined = IntrinsicTagName | undefined,
>(
  element: TagName,
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State> = {},
): any {
  const renderProp = componentProps.render
  const outProps = useRenderElementProps(componentProps, params)
  if (params.enabled === false) {
    return null
  }

  const state = params.state ?? ({} as State)
  return evaluateRenderProp(element, renderProp, outProps, state)
}
