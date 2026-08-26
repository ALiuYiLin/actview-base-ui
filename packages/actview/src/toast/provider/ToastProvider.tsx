import { ToastStore } from '../store';
import { ToastProviderContext } from './ToastProviderContext';

/**
 * Provides the toast store to `useToastManager` and toast components.
 * Renders a `<div>` element.
 *
 * actview 简化：store 在 Provider 实例内创建（每次挂载新建）；
 * react 版支持 `manager` prop 注入外部 manager——未迁移。
 */
export function ToastProvider(props: ToastProvider.Props) {
  // ============ setup（只执行一次） ============
  const {timeout = 4000, limit = Infinity} = props as any;

  const store = new ToastStore({timeout, limit});

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <ToastProviderContext.Provider value={store as any}>{props.children}</ToastProviderContext.Provider>;
}

export interface ToastProviderState {}

export interface ToastProviderProps {
  children?: any;
  /**
   * Default duration for toasts to remain visible.
   * @default 4000
   */
  timeout?: number | undefined;
  /**
   * Maximum number of toasts to display at once.
   * @default Infinity
   */
  limit?: number | undefined;
  [key: string]: any;
}

export namespace ToastProvider {
  export type State = ToastProviderState;
  export type Props = ToastProviderProps;
}
