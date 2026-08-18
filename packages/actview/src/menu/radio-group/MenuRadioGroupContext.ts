import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { MenuRoot } from '../root/MenuRoot';

export interface MenuRadioGroupContext {
  value: any;
  setValue: (newValue: any, eventDetails: MenuRoot.ChangeEventDetails) => void;
  disabled: boolean;
}

export const MenuRadioGroupContext = createContext<MenuRadioGroupContext | undefined>(
  'base-ui-menu-radio-group-context',
  undefined,
);

export function useMenuRadioGroupContext(): ComputedRef<MenuRadioGroupContext> {
  const context = MenuRadioGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuRadioGroupContext is missing. MenuRadioGroup parts must be placed within <Menu.RadioGroup>.',
    );
  }

  return context as ComputedRef<MenuRadioGroupContext>;
}
