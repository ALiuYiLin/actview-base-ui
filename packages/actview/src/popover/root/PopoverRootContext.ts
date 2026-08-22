import type { ComputedRef } from '@actview/core';
import type { PopoverStore } from '@/popover/store/PopoverStore';
import { createContext } from '@/internals/createContext';

export type PopoverRootContext<Payload = unknown> = PopoverStore<Payload>;

export const PopoverRootContext = createContext<PopoverRootContext | undefined>(
  'base-ui-popover-root-context',
  undefined,
);

export function usePopoverRootContext(optional?: false): ComputedRef<PopoverRootContext>;
export function usePopoverRootContext(optional: true): ComputedRef<PopoverRootContext | undefined>;
export function usePopoverRootContext(
  optional = false,
): ComputedRef<PopoverRootContext | undefined> {
  const context = PopoverRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: PopoverRootContext is missing. Popover parts must be placed within <Popover.Root>.',
    );
  }

  return context;
}
