import { createContext } from 'actview';

export interface NavigationMenuRootContextValue {
  open: boolean;
  /**
   * actview 版：响应式 computed（Provider 注入载体，消费端读 .value）。
   */
  openRef: {value: boolean};
  value: any;
  valueRef: {value: any};
  setValue: (value: any) => void;
  positionerElement: HTMLElement | null;
  setPositionerElement: (element: HTMLElement | null) => void;
  popupElement: HTMLElement | null;
  setPopupElement: (element: HTMLElement | null) => void;
  viewportElement: HTMLElement | null;
  setViewportElement: (element: HTMLElement | null) => void;
  rootRef: {value: HTMLElement | null};
  disabled: boolean;
  modal: boolean;
  orientation: 'horizontal' | 'vertical';
  activationDirection: 'left' | 'right' | 'up' | 'down' | null;
  setActivationDirection: (direction: 'left' | 'right' | 'up' | 'down' | null) => void;
}

export const NavigationMenuRootContext = createContext<
  NavigationMenuRootContextValue | undefined
>(undefined);

export function useNavigationMenuRootContext(optional = true): any {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = NavigationMenuRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <NavigationMenu.Root> is missing.');
  }
  return context;
}
