import { defineComponent, toValue } from 'actview';
import { DirectionContext, type TextDirection } from '@/internals/direction-context/DirectionContext';

/**
 * Enables RTL behavior for Base UI components.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export const DirectionProvider = defineComponent(function (
  componentProps: DirectionProvider.Props,
) {
  // Provider 组件（createContext 内置）：value prop 变化时 watch 同步 state
  return () => (
    <DirectionContext.Provider
      value={{direction: toValue(componentProps.direction) ?? 'ltr'}}
    >
      {componentProps.children}
    </DirectionContext.Provider>
  );
}) as unknown as (props: DirectionProvider.Props) => JSX.Element;

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
