import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { ToastRootContext } from './ToastRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Renders a toast.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(props) => ReactNode`，props 包含
 * toast 的全部字段与 `close`；自动关闭计时（timeout）未迁移。
 */
export function ToastRoot(componentProps: ToastRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useToastProviderContext(false)!;
  const toasts = store.useState('toasts');

  // 值形 props toRefs 活引用；children 单独排除（render prop）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // 渲染期查找（computed 惰性求值）：toast 变化时同步更新
  const toast = computed(() =>
    toasts.value.find((t: any) => t.id === (componentProps.toast?.id ?? componentProps.toast)),
  );

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // children 兼容 render prop（渲染期求值）。
  const content = computed(() => {
    const t = toast.value;
    if (!t) {
      return null;
    }
    const c = childrenRef?.value;
    return typeof c === 'function' ? c({...t, close: () => store.closeToast(t.id)}) : c;
  });

  const rootProps = computed<Record<string, any>>(() => ({
    ...elementProps.value,
    children: content.value,
  }));

  // store-as-is 载体：身份稳定的 getter 对象——toast 渲染期求值。
  const contextValue = {
    get toast() {
      return toast.value;
    },
    close() {
      const t = toast.value;
      if (t) {
        store.closeToast(t.id);
      }
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <ToastRootContext.Provider value={contextValue}>
      {toast.value
        ? useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              ref: componentProps.ref as any,
              props: rootProps.value,
            },
          )
        : null}
    </ToastRootContext.Provider>
  );
}

export interface ToastRootState {}

export interface ToastRootProps extends BaseUIComponentProps<'div', ToastRootState> {
  /**
   * The toast object to render.
   */
  toast?: any;
  children?: any;
  [key: string]: any;
}

export namespace ToastRoot {
  export type State = ToastRootState;
  export type Props = ToastRootProps;
}