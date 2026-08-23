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
  const context = MenuRadioGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuRadioGroupContext is missing. MenuRadioGroup parts must be placed within <Menu.RadioGroup>.',
    );
  }
  // 返回 Ref（响应式）：RadioItem 在 render 期读取最新 value。
  return context as unknown as MenuRadioGroupContextValue & {value: MenuRadioGroupContextValue};
}
