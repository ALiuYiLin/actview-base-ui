import type { ComputedRef } from '@actview/core';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';
import { createContext } from '../../internals/createContext';

export type ComboboxPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  | 'side'
  | 'align'
  | 'arrowRef'
  | 'arrowUncentered'
  | 'arrowStyles'
  | 'anchorHidden'
  | 'isPositioned'
>;

export const ComboboxPositionerContext = createContext<ComboboxPositionerContext | undefined>(
  'base-ui-combobox-positioner-context',
  undefined,
);

export function useComboboxPositionerContext(optional?: false): ComputedRef<ComboboxPositionerContext>;
export function useComboboxPositionerContext(
  optional: true,
): ComputedRef<ComboboxPositionerContext | undefined>;
export function useComboboxPositionerContext(
  optional = true,
): ComputedRef<ComboboxPositionerContext | undefined> {
  const context = ComboboxPositionerContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: <Combobox.Popup> and <Combobox.Arrow> must be used within the <Combobox.Positioner> component',
    );
  }
  return context as ComputedRef<ComboboxPositionerContext | undefined>;
}
