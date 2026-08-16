import { computed } from 'actview';
import {
  DirectionContext,
  type TextDirection,
} from '../internals/direction-context/DirectionContext';

/**
 * Enables RTL behavior for Base UI components.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export function DirectionProvider(props: DirectionProvider.Props) {
  const contextValue = computed(
    () =>
      ({
        direction: props.direction ?? 'ltr',
      }) as { direction: TextDirection },
  );

  return (
    <DirectionContext.Provider value={contextValue}>{props.children}</DirectionContext.Provider>
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
