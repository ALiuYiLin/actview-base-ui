import { createContext } from 'actview';
import type { Ref } from 'actview';
import type {
  Coords,
  HiddenState,
  OverflowEdges,
  Size,
  ScrollAreaRootState,
} from './ScrollAreaRoot';

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
  viewportRef: Ref<HTMLDivElement | null>;
  scrollbarYRef: Ref<HTMLDivElement | null>;
  thumbYRef: Ref<HTMLDivElement | null>;
  scrollbarXRef: Ref<HTMLDivElement | null>;
  thumbXRef: Ref<HTMLDivElement | null>;
  cornerRef: Ref<HTMLDivElement | null>;
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

export const ScrollAreaRootContext = createContext<ScrollAreaRootContext | undefined>(undefined);

export function useScrollAreaRootContext(): ScrollAreaRootContext {
  const context = ScrollAreaRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaRootContext is missing. ScrollArea parts must be placed within <ScrollArea.Root>.',
    );
  }
  return context;
}
