import { createContext } from 'actview';
import type { PreviewCardStore } from '../store/PreviewCardStore';

export const PreviewCardRootContext = createContext<PreviewCardRootContext<unknown> | undefined>(
  undefined,
);

export type PreviewCardRootContext<Payload> = PreviewCardStore<Payload>;

export function usePreviewCardRootContext<Payload>(optional: false): PreviewCardStore<Payload>;
export function usePreviewCardRootContext<Payload>(optional?: true): PreviewCardStore<Payload> | undefined;
export function usePreviewCardRootContext<Payload>(optional = true) {
  const context = PreviewCardRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  }
  return context.value as PreviewCardStore<Payload> | undefined;
}
