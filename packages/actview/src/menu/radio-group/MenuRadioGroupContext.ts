import { createContext } from 'actview';

export interface MenuRadioGroupContextValue {
  value: any;
  setValue: (newValue: any, eventDetails: any) => void;
  disabled: boolean;
}

export const MenuRadioGroupContext = createContext<MenuRadioGroupContextValue | undefined>(
  undefined,
);

export function useMenuRadioGroupContext() {
  // store-as-is：use() 原样返回注入载体（value 字段经 getter 实时）。
  const context = MenuRadioGroupContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuRadioGroupContext is missing. MenuRadioGroup parts must be placed within <Menu.RadioGroup>.',
    );
  }
  return context;
}
