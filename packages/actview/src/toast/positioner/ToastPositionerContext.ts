import type { ComputedRef } from '@actview/core';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';
import { createContext } from '../../internals/createContext';

export type ToastPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  'side' | 'align' | 'arrowRef' | 'arrowUncentered' | 'arrowStyles'
>;

export const ToastPositionerContext = createContext<ToastPositionerContext | undefined>(
  'base-ui-toast-positioner-context',
  undefined,
);

export function useToastPositionerContext() {
  const context = ToastPositionerContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ToastPositionerContext is missing. ToastPositioner parts must be placed within <Toast.Positioner>.',
    );
  }
  return context as ComputedRef<ToastPositionerContext>;
}
