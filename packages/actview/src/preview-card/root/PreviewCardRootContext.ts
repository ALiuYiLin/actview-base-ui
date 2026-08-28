import { createContext } from 'actview';
import type { PreviewCardStore } from '../store/PreviewCardStore';

export const PreviewCardRootContext = createContext<PreviewCardRootContext<unknown> | undefined>(
  undefined,
);

export type PreviewCardRootContext<Payload> = PreviewCardStore<Payload>;

export function usePreviewCardRootContext<Payload>(optional: false): PreviewCardStore<Payload>;
export function usePreviewCardRootContext<Payload>(optional?: true): PreviewCardStore<Payload> | undefined;
export function usePreviewCardRootContext<Payload>(optional = true) {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = PreviewCardRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  }
  return context as PreviewCardStore<Payload> | undefined;
}
