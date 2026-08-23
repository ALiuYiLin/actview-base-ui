import { createContext } from 'actview';

export const PreviewCardPortalContext = createContext<boolean | undefined>(undefined);

export function usePreviewCardPortalContext() {
  const context = PreviewCardPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <PreviewCard.Portal> is missing.');
  }
  return context.value;
}
