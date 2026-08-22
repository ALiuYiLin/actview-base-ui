import type { ComputedRef } from '@actview/core';
import type { ToastObject } from '@/toast/useToastManager';
import { createContext } from '@/internals/createContext';

export type ToastLabelIdSetter = (
  next: string | undefined | ((current: string | undefined) => string | undefined),
) => void;

export interface ToastRootContext {
  toast: ToastObject<any>;
  setTitleId: ToastLabelIdSetter;
  setDescriptionId: ToastLabelIdSetter;
  visibleIndex: number;
  expanded: boolean;
  recalculateHeight: (flushSync?: boolean) => void;
}

export const ToastRootContext = createContext<ToastRootContext | undefined>(
  'base-ui-toast-root-context',
  undefined,
);

export function useToastRootContext(): ComputedRef<ToastRootContext> {
  const context = ToastRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ToastRootContext is missing. Toast parts must be used within <Toast.Root>.',
    );
  }
  return context as ComputedRef<ToastRootContext>;
}
