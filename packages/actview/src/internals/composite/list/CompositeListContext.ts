import type { ComputedRef } from '@actview/core';
import { createContext } from '../../createContext';

export interface CompositeListRegistration<Metadata> {
  metadata: Metadata | null;
  index: number | null;
  label: string | null | undefined;
  textRef: { current?: HTMLElement | null } | undefined;
}

export interface CompositeListContextValue<Metadata> {
  register: (node: Element, registration: CompositeListRegistration<Metadata>) => void;
  unregister: (node: Element) => void;
  subscribeMapChange: (fn: (map: Map<Element, Metadata>) => void) => () => void;
  nextIndexRef: { current: number };
}

const defaultContext: CompositeListContextValue<any> = {
  register: () => {},
  unregister: () => {},
  subscribeMapChange: () => () => {},
  nextIndexRef: { current: 0 },
};

export const CompositeListContext = createContext<CompositeListContextValue<any>>(
  'base-ui-composite-list-context',
  defaultContext,
);

export function useCompositeListContext(): ComputedRef<CompositeListContextValue<any>> {
  return CompositeListContext.use();
}
