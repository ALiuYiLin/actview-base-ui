import type { BaseUIEvent } from '../types';

/**
 * Merges multiple sets of props (actview 转译版，逻辑对齐 React 版 mergeProps)。
 * 遵循 Object.assign 模式：右侧对象的字段覆盖左侧冲突字段；事件处理器、
 * `className` 与 `style` 除外。
 *
 * 事件处理器按右到左顺序合并（最右先执行）。actview 的事件是原生 DOM 事件，
 * 最右的 handler 可通过 `event.preventBaseUIHandler()` 阻止左侧 handler 执行
 * （React 版只对合成事件生效；actview 环境所有事件都是原生事件，统一走该路径）。
 *
 * `className` 右到左拼接；`style` 浅合并（右侧覆盖）。
 *
 * Props 可以是对象或函数（接收之前合并的 props 并返回新 props）。
 * `ref` 不参与合并。
 *
 * @public
 */
export function mergeProps(a: any, b: any, c?: any, d?: any, e?: any) {
  if (!c && !d && !e && !a) {
    return createInitialMergedProps(b);
  }

  // We need to mutably own `merged`.
  let merged = createInitialMergedProps(a);

  if (b) {
    merged = mergeInto(merged, b);
  }
  if (c) {
    merged = mergeInto(merged, c);
  }
  if (d) {
    merged = mergeInto(merged, d);
  }
  if (e) {
    merged = mergeInto(merged, e);
  }

  return merged;
}

/**
 * Merges an arbitrary number of props using the same logic as {@link mergeProps}.
 * This function accepts an array of props instead of individual arguments.
 *
 * @param props Array of props to merge.
 * @returns The merged props.
 * @see mergeProps
 * @public
 */
export function mergePropsN<T = any>(props: Array<any>): T {
  if (props.length === 0) {
    return EMPTY_PROPS as T;
  }
  if (props.length === 1) {
    return createInitialMergedProps(props[0]) as T;
  }

  // We need to mutably own `merged`.
  let merged = createInitialMergedProps(props[0]);

  for (let i = 1; i < props.length; i += 1) {
    merged = mergeInto(merged, props[i]);
  }

  return merged as T;
}

const EMPTY_PROPS = {};

function createInitialMergedProps(inputProps: any) {
  if (isPropsGetter(inputProps)) {
    // Getter-returned handlers intentionally keep their existing semantics.
    return { ...resolvePropsGetter(inputProps, EMPTY_PROPS) };
  }

  return copyInitialProps(inputProps);
}

function mergeInto(merged: Record<string, any>, inputProps: any) {
  if (isPropsGetter(inputProps)) {
    return resolvePropsGetter(inputProps, merged);
  }
  return mutablyMergeInto(merged, inputProps);
}

function copyInitialProps(inputProps: Record<string, any> | undefined) {
  const copiedProps = { ...inputProps } as Record<string, any>;

  // `copiedProps` is our fresh own-object copy, so iterating with `for...in` is safe here.
  // eslint-disable-next-line guard-for-in
  for (const propName in copiedProps) {
    const propValue = copiedProps[propName];
    if (isEventHandler(propName, propValue)) {
      copiedProps[propName] = wrapEventHandler(propValue);
    }
  }

  return copiedProps;
}

/**
 * Merges two sets of props. In case of conflicts, the external props take precedence.
 */
function mutablyMergeInto(
  mergedProps: Record<string, any>,
  externalProps: Record<string, any> | undefined,
) {
  if (!externalProps) {
    return mergedProps;
  }

  // eslint-disable-next-line guard-for-in
  for (const propName in externalProps) {
    const externalPropValue = externalProps[propName];

    switch (propName) {
      case 'style': {
        mergedProps[propName] = mergeObjects(
          mergedProps.style as Record<string, any> | undefined,
          externalPropValue as Record<string, any> | undefined,
        );
        break;
      }
      case 'className': {
        mergedProps[propName] = mergeClassNames(mergedProps.className, externalPropValue as string);
        break;
      }
      default: {
        if (isEventHandler(propName, externalPropValue)) {
          mergedProps[propName] = mergeEventHandlers(mergedProps[propName], externalPropValue);
        } else {
          mergedProps[propName] = externalPropValue;
        }
      }
    }
  }

  return mergedProps;
}

function isEventHandler(key: string, value: unknown) {
  // This approach is more efficient than using a regex.
  const code0 = key.charCodeAt(0);
  const code1 = key.charCodeAt(1);
  const code2 = key.charCodeAt(2);
  return (
    code0 === 111 /* o */ &&
    code1 === 110 /* n */ &&
    code2 >= 65 /* A */ &&
    code2 <= 90 /* Z */ &&
    (typeof value === 'function' || typeof value === 'undefined')
  );
}

function isPropsGetter(inputProps: any): inputProps is (props: any) => any {
  return typeof inputProps === 'function';
}

function resolvePropsGetter(inputProps: any, previousProps: any) {
  if (isPropsGetter(inputProps)) {
    return inputProps(previousProps);
  }

  return inputProps ?? EMPTY_PROPS;
}

function mergeEventHandlers(ourHandler: Function | undefined, theirHandler: Function | undefined) {
  if (!theirHandler) {
    return ourHandler;
  }
  if (!ourHandler) {
    return wrapEventHandler(theirHandler);
  }

  return (...args: unknown[]) => {
    const event = args[0];

    if (isEventObject(event)) {
      const baseUIEvent = event as any;

      makeEventPreventable(baseUIEvent);

      const result = theirHandler(...args);

      if (!baseUIEvent.baseUIHandlerPrevented) {
        ourHandler?.(...args);
      }

      return result;
    }

    const result = theirHandler(...args);
    ourHandler?.(...args);
    return result;
  };
}

function wrapEventHandler(handler: Function | undefined) {
  if (!handler) {
    return handler;
  }

  return (...args: unknown[]) => {
    const event = args[0];

    if (isEventObject(event)) {
      makeEventPreventable(event as any);
    }

    return handler(...args);
  };
}

/**
 * Adds the `preventBaseUIHandler` mechanism to a DOM event object
 * (actview 事件为原生事件——直接扩展事件对象，无 React 合成事件包装层）。
 */
export function makeEventPreventable<T extends Event>(event: BaseUIEvent<T>) {
  event.preventBaseUIHandler = () => {
    (event.baseUIHandlerPrevented as boolean) = true;
  };

  return event;
}

export function mergeClassNames(
  ourClassName: string | undefined,
  theirClassName: string | undefined,
) {
  if (theirClassName) {
    if (ourClassName) {
      // eslint-disable-next-line prefer-template
      return theirClassName + ' ' + ourClassName;
    }

    return theirClassName;
  }

  return ourClassName;
}

/**
 * actview 事件都是原生 DOM 事件（对象可扩展，可挂 preventBaseUIHandler）。
 * React 版用 `'nativeEvent' in event` 区分合成事件；actview 无合成事件层，
 * 所有事件对象统一走 prevention 路径。
 */
function isEventObject(event: unknown): event is Event {
  return event != null && typeof event === 'object';
}

/** 浅合并两个对象（对齐 @base-ui/utils/mergeObjects 的 style 合并语义）。 */
function mergeObjects(
  a: Record<string, any> | undefined,
  b: Record<string, any> | undefined,
): Record<string, any> | undefined {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return {...a, ...b};
}
