// ============================================================
// mergeProps —— props 合并（对齐 base-ui merge-props/mergeProps.ts 语义）
//
// 规则：
//  - 右侧字段覆盖左侧；三类特例：
//    · className：字符串拼接（右在前）
//    · style：对象浅合并（右覆盖）
//    · on[A-Z]* 事件：合并为链——先执行右侧 handler，再执行左侧；
//      事件对象上会挂 preventBaseUIHandler()，右侧可调用以跳过左侧
//      （actview 事件为原生 Event 对象，直接扩展）
//  - ref 不参与合并（由 useMergedRefs 单独负责）
//  - 支持 props getter 形态：传入函数 (prev) => props，收到此前的合并结果
//    （返回值整体替换——不自动合并，见 mergePropsN 链中 getter 规则）
// ============================================================

const EMPTY_PROPS = {}

function isEventHandler(key: string, value: unknown) {
  // 比 regex 更快：on + 大写开头
  const code0 = key.charCodeAt(0)
  const code1 = key.charCodeAt(1)
  const code2 = key.charCodeAt(2)
  return (
    code0 === 111 /* o */ &&
    code1 === 110 /* n */ &&
    code2 >= 65 /* A */ &&
    code2 <= 90 /* Z */ &&
    (typeof value === 'function' || typeof value === 'undefined')
  )
}

function isPropsGetter(input: any): input is (prev: any) => any {
  return typeof input === 'function'
}

function makeEventPreventable(event: unknown) {
  if (event && typeof event === 'object') {
    ;(event as any).preventBaseUIHandler = () => {
      ;(event as any).baseUIHandlerPrevented = true
    }
  }
  return event
}

function mergeEventHandlers(ourHandler: any, theirHandler: any) {
  if (!theirHandler) return ourHandler
  if (!ourHandler) return wrapEventHandler(theirHandler)
  return (...args: unknown[]) => {
    const event = args[0]
    makeEventPreventable(event)
    const result = theirHandler(...args)
    if (!(event as any)?.baseUIHandlerPrevented) {
      ourHandler?.(...args)
    }
    return result
  }
}

function wrapEventHandler(handler: any) {
  if (!handler) return handler
  return (...args: unknown[]) => {
    makeEventPreventable(args[0])
    return handler(...args)
  }
}

function copyInitialProps(inputProps: any) {
  const copied = { ...inputProps }
  for (const propName in copied) {
    const v = copied[propName]
    if (isEventHandler(propName, v)) copied[propName] = wrapEventHandler(v)
  }
  return copied
}

function mutablyMergeInto(merged: Record<string, any>, externalProps: any) {
  if (!externalProps) return merged
  for (const propName in externalProps) {
    const externalValue = externalProps[propName]
    switch (propName) {
      case 'style': {
        merged[propName] = { ...(merged.style ?? {}), ...(externalValue ?? {}) }
        break
      }
      case 'className': {
        merged[propName] = [externalValue, merged[propName]]
          .filter(Boolean)
          .join(' ')
        break
      }
      default: {
        if (isEventHandler(propName, externalValue)) {
          merged[propName] = mergeEventHandlers(merged[propName], externalValue)
        } else {
          merged[propName] = externalValue
        }
      }
    }
  }
  return merged
}

function mergeInto(merged: Record<string, any>, inputProps: any) {
  if (isPropsGetter(inputProps)) return inputProps({ ...merged })
  return mutablyMergeInto(merged, inputProps)
}

/** 任意参合并（useRenderElement 内部使用） */
export function mergeProps(...inputs: any[]): Record<string, any> {
  if (inputs.length === 0) return EMPTY_PROPS
  const [first, ...rest] = inputs
  let merged = isPropsGetter(first) ? first({ ...EMPTY_PROPS }) : copyInitialProps(first)
  for (const next of rest) merged = mergeInto(merged, next)
  return merged
}

/** 任意数量 props 合并（Base UI mergePropsN 等价） */
export function mergePropsN(props: any[]): Record<string, any> {
  if (props.length === 0) return EMPTY_PROPS
  if (props.length === 1) {
    return isPropsGetter(props[0]) ? props[0]({}) : copyInitialProps(props[0])
  }
  let merged = isPropsGetter(props[0]) ? props[0]({}) : copyInitialProps(props[0])
  for (let i = 1; i < props.length; i++) merged = mergeInto(merged, props[i])
  return merged
}

export function mergeClassNames(
  ourClassName: string | undefined,
  theirClassName: string | undefined,
) {
  if (theirClassName) {
    if (ourClassName) return theirClassName + ' ' + ourClassName
    return theirClassName
  }
  return ourClassName
}
