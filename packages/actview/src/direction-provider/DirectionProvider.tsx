import { DirectionContext } from '@/internals/direction-context/DirectionContext';
import type { TextDirection } from '@/internals/direction-context/DirectionContext';

/**
 * Enables RTL behavior for Base UI components.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export function DirectionProvider(componentProps: DirectionProvider.Props) {
  // store-as-is 载体：身份稳定 getter 对象（字段渲染期求值——消费端读字段
  // 即追踪，direction 动态变化实时生效）。
  const contextValue: DirectionContext = {
    get direction(): TextDirection {
      return componentProps.direction ?? 'ltr';
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 渲染期直读（props 代理，每次渲染最新）。
  return (
    <DirectionContext.Provider value={contextValue}>
      {componentProps.children}
    </DirectionContext.Provider>
  );
}

export interface DirectionProviderState {}

export interface DirectionProviderProps {
  children?: any;
  /**
   * The reading direction of the text
   * @default 'ltr'
   */
  direction?: TextDirection | undefined;
}

export namespace DirectionProvider {
  export type State = DirectionProviderState;
  export type Props = DirectionProviderProps;
}
