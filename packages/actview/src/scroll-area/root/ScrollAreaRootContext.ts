import type { ComputedRef } from '@actview/core';
import type {
  Coords,
  HiddenState,
  OverflowEdges,
  Size,
  ScrollAreaRootState,
} from './ScrollAreaRoot';
import { createContext } from '../../internals/createContext';

export interface ScrollAreaRootContext {
  cornerSize: Size;
  setCornerSize: (value: Size) => void;
  thumbSize: Size;
  setThumbSize: (value: Size) => void;
  hasMeasuredScrollbar: boolean;
  setHasMeasuredScrollbar: (value: boolean) => void;
  touchModality: boolean;
  hovering: boolean;
  setHovering: (value: boolean) => void;
  scrollingX: boolean;
  scrollingY: boolean;
  viewportRef: { current: HTMLDivElement | null };
  scrollbarYRef: { current: HTMLDivElement | null };
  thumbYRef: { current: HTMLDivElement | null };
  scrollbarXRef: { current: HTMLDivElement | null };
  thumbXRef: { current: HTMLDivElement | null };
  cornerRef: { current: HTMLDivElement | null };
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
  handleScroll: (scrollPosition: Coords) => void;
  disableViewportSnap: () => void;
  rootId: string | undefined;
  hiddenState: HiddenState;
  setHiddenState: (value: HiddenState) => void;
  overflowEdges: OverflowEdges;
  setOverflowEdges: (value: OverflowEdges) => void;
  viewportState: ScrollAreaRootState;
  overflowEdgeThreshold: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  };
}

export const ScrollAreaRootContext = createContext<ScrollAreaRootContext | undefined>(
  'base-ui-scroll-area-root-context',
  undefined,
);

export function useScrollAreaRootContext(): ComputedRef<ScrollAreaRootContext> {
  const context = ScrollAreaRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ScrollAreaRootContext is missing. ScrollArea parts must be placed within <ScrollArea.Root>.',
    );
  }
  return context as ComputedRef<ScrollAreaRootContext>;
}
