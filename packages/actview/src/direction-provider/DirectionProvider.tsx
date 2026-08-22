import { computed, defineComponent } from 'actview';
import {
  DirectionContext,
  type TextDirection,
} from '@/internals/direction-context/DirectionContext';

/**
 * Enables RTL behavior for Base UI components.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export const DirectionProvider = defineComponent(function (
  componentProps: DirectionProvider.Props,
) {
  // ================= setup（只执行一次） =================
  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo，
  // 也保证 Provider watch 只在 direction 真正变化时同步）
  const contextValue = computed<DirectionContext>(() => ({
    direction: componentProps.direction ?? 'ltr',
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const { children } = componentProps;

    // Provider 传值不传 ref（案例 5）：value={contextValue.value}，
    // 引用稳定由 computed 惰性缓存保证
    return (
      <DirectionContext.Provider value={contextValue.value}>
        {children}
      </DirectionContext.Provider>
    );
  };
}) as (props: DirectionProvider.Props) => any;

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
