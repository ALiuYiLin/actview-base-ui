import { createContext } from 'actview';

export const PreviewCardPortalContext = createContext<boolean | undefined>(undefined);

export function usePreviewCardPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const context = PreviewCardPortalContext.use();
  if (context === undefined) {
    throw new Error('Base UI: <PreviewCard.Portal> is missing.');
  }
  return context;
}
