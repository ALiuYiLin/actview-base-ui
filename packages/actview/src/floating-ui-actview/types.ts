import type { ComputedRef, Ref } from '@actview/core';
import type {
  ComputePositionConfig,
  MiddlewareData,
  Placement,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { HTMLProps } from '@/types';
import type { FloatingTreeStore } from '@/floating-ui-actview/components/FloatingTreeStore';
import type { FloatingRootStore } from '@/floating-ui-actview/components/FloatingRootStore';

export * from '.';
export type { FloatingDelayGroupProps } from '@/floating-ui-actview/components/FloatingDelayGroup';
export type { FloatingFocusManagerProps } from '@/floating-ui-actview/components/FloatingFocusManager';
export type { UseFloatingPortalNodeProps } from '@/floating-ui-actview/components/FloatingPortal';
export type { UseClientPointProps } from '@/floating-ui-actview/hooks/useClientPoint';
export type { UseDismissProps } from '@/floating-ui-actview/hooks/useDismiss';
export type { UseFocusProps } from '@/floating-ui-actview/hooks/useFocus';
export type { UseHoverProps } from '@/floating-ui-actview/hooks/useHover';
export type { HandleCloseContext, HandleClose } from '@/floating-ui-actview/hooks/useHoverShared';
export type { UseHoverFloatingInteractionProps } from '@/floating-ui-actview/hooks/useHoverFloatingInteraction';
export type { UseHoverReferenceInteractionProps } from '@/floating-ui-actview/hooks/useHoverReferenceInteraction';
export type { UseListNavigationProps } from '@/floating-ui-actview/hooks/useListNavigation';
export type { UseTypeaheadProps } from '@/floating-ui-actview/hooks/useTypeahead';
export type { UseFloatingRootContextOptions } from '@/floating-ui-actview/hooks/useFloatingRootContext';
export type { SafePolygonOptions } from '@/floating-ui-actview/safePolygon';
export type { FloatingTreeProps, FloatingNodeProps } from '@/floating-ui-actview/components/FloatingTree';
export type {
  AlignedPlacement,
  Alignment,
  ArrowOptions,
  AutoPlacementOptions,
  AutoUpdateOptions,
  Axis,
  Boundary,
  ClientRectObject,
  ComputePositionConfig,
  ComputePositionReturn,
  Coords,
  DetectOverflowOptions,
  Dimensions,
  ElementContext,
  ElementRects,
  Elements,
  FlipOptions,
  FloatingElement,
  HideOptions,
  InlineOptions,
  Length,
  Middleware,
  MiddlewareArguments,
  MiddlewareData,
  MiddlewareReturn,
  MiddlewareState,
  NodeScroll,
  OffsetOptions,
  Padding,
  Placement,
  Platform,
  Rect,
  ReferenceElement,
  RootBoundary,
  ShiftOptions,
  Side,
  SideObject,
  SizeOptions,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';
export {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  detectOverflow,
  flip,
  getOverflowAncestors,
  hide,
  inline,
  limitShift,
  offset,
  platform,
  shift,
  size,
} from '@floating-ui/dom';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Delay = number | Partial<{ open: number; close: number }>;

export type NarrowedElement<T> = T extends Element ? T : Element;

export interface ExtendedRefs {
  reference: { current: ReferenceType | null };
  floating: { current: HTMLElement | null };
  domReference: { current: NarrowedElement<ReferenceType> | null };
  setReference(node: ReferenceType | null): void;
  setFloating(node: HTMLElement | null): void;
  setPositionReference(node: ReferenceType | null): void;
}

export interface ExtendedElements {
  reference: ReferenceType | null;
  floating: HTMLElement | null;
  domReference: NarrowedElement<ReferenceType> | null;
}

export interface FloatingEvents {
  emit<T extends string>(event: T, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

export interface ContextData {
  openEvent?: Event | undefined;
  floatingContext?: FloatingContext | undefined;
  [key: string]: any;
}

export type FloatingRootContext = FloatingRootStore;

/**
 * The positioning data returned by `useFloating`, with reactive refs in place of the
 * plain values `@floating-ui/react-dom` produces.
 */
interface UsePositionFloatingReturn {
  x: Ref<number>;
  y: Ref<number>;
  placement: Ref<Placement>;
  strategy: Ref<Strategy>;
  middlewareData: Ref<MiddlewareData>;
  isPositioned: Ref<boolean>;
  update: () => void;
  floatingStyles: ComputedRef<Record<string, string | number>>;
  refs: ExtendedRefs;
  elements: ExtendedElements;
}

export type FloatingContext = Omit<
  UsePositionFloatingReturn,
  'refs' | 'elements'
> & {
  open: Ref<boolean>;
  onOpenChange(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  events: FloatingEvents;
  dataRef: { current: ContextData };
  nodeId: string | undefined;
  floatingId: string | undefined;
  refs: ExtendedRefs;
  elements: ExtendedElements;
  rootStore: FloatingRootContext;
};

export interface FloatingNodeType {
  id: string | undefined;
  parentId: string | null;
  context?: FloatingContext | undefined;
}

export type FloatingTreeType = FloatingTreeStore;

export interface ElementProps {
  reference?: HTMLProps<Element> | undefined;
  floating?: HTMLProps<HTMLElement> | undefined;
  item?: HTMLProps<HTMLElement> | undefined;
  trigger?: HTMLProps<Element> | undefined;
}

export type ReferenceType = Element | VirtualElement;

export type UseFloatingData = Prettify<UseFloatingReturn>;

export type UseFloatingReturn = Prettify<
  UsePositionFloatingReturn & {
    /**
     * `FloatingContext`
     */
    context: Prettify<FloatingContext>;
  }
>;

/**
 * Equivalent of `@floating-ui/react-dom`'s `UseFloatingOptions` (minus `elements`).
 */
interface UsePositionOptions extends Partial<ComputePositionConfig> {
  /**
   * A callback invoked when both the reference and floating elements are
   * mounted, and cleaned up when either is unmounted. This is useful for
   * setting up event listeners (e.g. pass `autoUpdate`).
   */
  whileElementsMounted?:
    | ((reference: ReferenceType, floating: HTMLElement, update: () => void) => void | (() => void))
    | undefined;
  /**
   * Object containing the reference and floating elements.
   */
  elements?:
    | {
        reference?: ReferenceType | null | undefined;
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
  /**
   * The `open` state of the floating element to synchronize with the
   * `isPositioned` value.
   * @default false
   */
  open?: boolean | Ref<boolean> | undefined;
  /**
   * Whether to use `transform` for positioning instead of `top` and `left`
   * (layout) in the `floatingStyles` object.
   * @default true
   */
  transform?: boolean | undefined;
}

export interface UseFloatingOptions extends Omit<UsePositionOptions, 'elements'> {
  rootContext?: FloatingRootContext | undefined;
  /**
   * Object of external elements as an alternative to the `refs` object setters.
   */
  elements?:
    | {
        /**
         * Externally passed reference element. Store in state.
         */
        reference?: ReferenceType | null | undefined;
        /**
         * Externally passed floating element. Store in state.
         */
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
  /**
   * An event callback that is invoked when the floating element is opened or
   * closed.
   */
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  /**
   * Unique node id when using `FloatingTree`.
   */
  nodeId?: string | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}
