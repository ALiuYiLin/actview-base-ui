import { createContext } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { Ref } from 'actview';

export const PreviewCardPositionerContext = createContext<PreviewCardPositionerContext | undefined>(
  undefined,
);

export interface PreviewCardPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: Ref<Element | null>;
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function usePreviewCardPositionerContext() {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = PreviewCardPositionerContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: PreviewCardPositionerContext is missing. PreviewCard parts must be placed within <PreviewCard.Positioner>.',
    );
  }
  return context;
}
