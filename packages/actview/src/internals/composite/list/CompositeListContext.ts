import { createContext } from 'actview';

export interface CompositeListRegistration<Metadata> {
  metadata: Metadata | null;
  index: number | null;
  label: string | null | undefined;
  textRef: {value: HTMLElement | null} | undefined;
}

export interface CompositeListContextValue<Metadata> {
  register: (node: Element, registration: CompositeListRegistration<Metadata>) => void;
  unregister: (node: Element) => void;
  subscribeMapChange: (fn: (map: Map<Element, Metadata>) => void) => () => void;
  nextIndexRef: {current: number};
}

const defaultContext: CompositeListContextValue<any> = {
  register: () => {},
  unregister: () => {},
  subscribeMapChange: () => () => {},
  nextIndexRef: {current: 0},
};

export const CompositeListContext = createContext<CompositeListContextValue<any>>(defaultContext);

export function useCompositeListContext() {
  return CompositeListContext.use();
}
