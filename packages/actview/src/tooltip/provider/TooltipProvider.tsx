import { TooltipProviderContext } from './TooltipProviderContext';

/**
 * Provides a shared delay for multiple tooltips.
 *
 * actview 简化：提供 TooltipProviderContext（delay 值）供 Trigger 读取；
 * FloatingDelayGroup（相邻 tooltip 的 instant 打开逻辑）未迁移——记录待补。
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipProvider(props: TooltipProvider.Props) {
  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <TooltipProviderContext.Provider value={(props as any).delay ?? (props as any).closeDelay}>
      {(() => {
        // children 渲染期读取（PD-15）
        const child = (props as any).children;
        return typeof child === 'function' ? (child as any)() : child;
      })()}
    </TooltipProviderContext.Provider>
  );
}

export interface TooltipProviderState {}

export interface TooltipProviderProps {
  children?: any;
  /**
   * How long to wait before opening the tooltip on hover. Specified in milliseconds.
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing a tooltip. Specified in milliseconds.
   */
  closeDelay?: number | undefined;
  /**
   * Another tooltip will open instantly if the previous tooltip
   * is closed within this timeout. Specified in milliseconds.
   * @default 400
   */
  timeout?: number | undefined;
  [key: string]: any;
}

export namespace TooltipProvider {
  export type State = TooltipProviderState;
  export type Props = TooltipProviderProps;
}
