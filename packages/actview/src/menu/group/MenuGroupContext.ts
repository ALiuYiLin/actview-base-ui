import { createContext } from 'actview';

export type MenuGroupContextValue = (
  value: string | undefined | ((current: string | undefined) => string | undefined),
) => void;

export const MenuGroupContext = createContext<MenuGroupContextValue | undefined>(undefined);

export function useMenuGroupRootContext() {
  const context = MenuGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
    );
  }
  return context.value;
}
