import { createContext } from 'actview';

export interface NavigationMenuRootContextValue {
  open: boolean;
  /**
   * actview 版：响应式 ref（context 对象本身非响应式，子组件读 ref 触发更新）。
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
  const context = NavigationMenuRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <NavigationMenu.Root> is missing.');
  }
  return context.value;
}
