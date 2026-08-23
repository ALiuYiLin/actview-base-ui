import { createContext } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';

export const PreviewCardPositionerContext = createContext<PreviewCardPositionerContext | undefined>(
  undefined,
);

export interface PreviewCardPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: {current: Element | null};
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function usePreviewCardPositionerContext() {
  const context = PreviewCardPositionerContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: PreviewCardPositionerContext is missing. PreviewCard parts must be placed within <PreviewCard.Positioner>.',
    );
  }
  return context.value;
}
