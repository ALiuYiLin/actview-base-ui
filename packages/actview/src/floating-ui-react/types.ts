import type { Ref } from 'actview';
import type { FloatingRootStore } from './components/FloatingRootStore';
import type { FloatingTreeStore } from './components/FloatingTreeStore';
import type { ReferenceType } from '@floating-ui/actview';

export type { ReferenceType } from '@floating-ui/actview';

export interface VirtualElement {
  getBoundingClientRect(): DOMRect;
  contextElement?: Element | undefined;
}

export type Alignment = 'start' | 'end';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type AlignedPlacement = Side | `${Side}-${Alignment}`;
export type Placement = AlignedPlacement | 'auto' | `auto-${Side}`;
export type Strategy = 'absolute' | 'fixed';
export type FloatingElement = HTMLElement;
export type Platform = Record<string, any>;
export type Boundary = any;
export type Padding = any;
export type Middleware = any;
export type MiddlewareState = any;
export type MiddlewareReturn = any;
export type MiddlewareData = Record<string, any>;
export type Rect = {x: number; y: number; width: number; height: number};
export type Dimensions = {width: number; height: number};
export type Delay = number | Partial<{open: number; close: number}>;

export interface ExtendedElements<RT extends ReferenceType = ReferenceType> {
  reference: RT | null;
  floating: HTMLElement | null;
  domReference: Element | null;
}

export interface SafePolygonOptions {
  buffer?: number | undefined;
  blockPointerEvents?: boolean | undefined;
  requireIntent?: number | undefined;
  hideDelay?: number | undefined;
  getScope?: (() => HTMLElement | SVGSVGElement | null) | undefined;
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

export type FloatingContext = {
  open: boolean;
  onOpenChange(open: boolean, eventDetails: any): void;
  events: FloatingEvents;
  dataRef: Ref<ContextData>;
  nodeId: string | undefined;
  floatingId: string | undefined;
  refs: {
    reference: Ref<ReferenceType | null>;
    floating: Ref<HTMLElement | null>;
    domReference: Ref<Element | null>;
    setReference(node: ReferenceType | null): void;
    setFloating(node: HTMLElement | null): void;
    setPositionReference(node: ReferenceType | null): void;
  };
  elements: {
    reference: ReferenceType | null;
    floating: HTMLElement | null;
    domReference: Element | null;
  };
  rootStore: FloatingRootContext;
};

export interface FloatingNodeType {
  id: string | undefined;
  parentId: string | null;
  context?: FloatingContext | undefined;
}

export type FloatingTreeType = FloatingTreeStore;

export interface ElementProps {
  reference?: Record<string, any> | undefined;
  floating?: Record<string, any> | undefined;
  item?: Record<string, any> | undefined;
  trigger?: Record<string, any> | undefined;
}

export type UseFloatingReturn<RT extends ReferenceType = ReferenceType> = {
  context: FloatingContext;
  refs: FloatingContext['refs'];
  elements: FloatingContext['elements'];
  floatingStyles: Record<string, any>;
  placement: any;
  isPositioned: boolean;
  middlewareData: any;
  update(): void;
};

export type UseFloatingRootContextOptions = {
  open: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: string): void;
  elements?: {reference?: ReferenceType | null; floating?: HTMLElement | null};
  floatingId?: string;
  refs?: any;
};
