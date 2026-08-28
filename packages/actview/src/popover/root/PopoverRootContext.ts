import { createContext } from 'actview';
import type { PopoverStore } from '../store/PopoverStore';

export const PopoverRootContext = createContext<PopoverRootContext<unknown> | undefined>(
  undefined,
);

export type PopoverRootContext<Payload> = PopoverStore<Payload>;

export function usePopoverRootContext<Payload>(optional: false): PopoverStore<Payload>;
export function usePopoverRootContext<Payload>(optional?: true): PopoverStore<Payload> | undefined;
export function usePopoverRootContext<Payload>(optional = true) {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = PopoverRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: PopoverRootContext is missing. Popover parts must be placed within <Popover.Root>.',
    );
  }
  return context as PopoverStore<Payload> | undefined;
}
