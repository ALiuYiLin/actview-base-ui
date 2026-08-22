import { describe, expect, it, vi } from 'vitest';
import { ComboboxChipRemove } from '@/combobox/chip-remove/ComboboxChipRemove';
import { ComboboxChipContext } from '@/combobox/chip/ComboboxChipContext';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { FieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { createRenderer } from '#/test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      disabled: false,
      readOnly: false,
      selectedValue: ['apple', 'banana'],
      isItemEqualToValue: (a: any, b: any) => a === b,
    };
    return { value: values[key] };
  },
  state: {
    activeIndex: null,
    valuesRef: { current: ['apple', 'banana'] },
    keyboardActiveRef: { current: false },
    inputRef: { current: { focus: () => {} } },
    setSelectedValue: () => {},
    setIndices: () => {},
  },
  set: () => {},
} as any;

const chipContext = { index: 0 };

const fieldRootContext = {
  disabled: false,
  name: '',
  invalid: undefined,
  setValidityData: () => {},
  state: {
    dirty: false,
    filled: false,
    focused: false,
    touched: false,
    valid: null,
  },
  setFilled: () => {},
  setDirty: () => {},
  setTouched: () => {},
  setFocused: () => {},
  validityData: { initialValue: undefined },
  validationMode: 'onSubmit',
  shouldValidateOnChange: () => false,
  registerFieldControl: () => {},
  validation: {
    registerInput: () => () => {},
    getInputControl: () => null,
    registeredInputs: new Map(),
    change: () => {},
    getValidationProps: () => ({}),
    inputRef: { current: null },
    validate: () => {},
  },
};

describe('<Combobox.ChipRemove />', () => {
  const { render, fireEvent } = createRenderer();

  it('renders a button element', async () => {
    function Demo() {
      return (
        <FieldRootContext.Provider value={fieldRootContext}>
          <ComboboxRootContext.Provider value={mockStore}>
            <ComboboxChipContext.Provider value={chipContext}>
              <ComboboxChipRemove data-testid="remove" />
            </ComboboxChipContext.Provider>
          </ComboboxRootContext.Provider>
        </FieldRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('remove');
    expect(el).toBeInstanceOf(HTMLButtonElement);
  });

  it('throws a descriptive error when rendered outside <Combobox.Chip>', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      function Demo() {
        return (
          <FieldRootContext.Provider value={fieldRootContext}>
            <ComboboxRootContext.Provider value={mockStore}>
              <ComboboxChipRemove data-testid="remove" />
            </ComboboxRootContext.Provider>
          </FieldRootContext.Provider>
        );
      }

      await render(Demo, {});
      expect(consoleSpy).toHaveBeenCalledWith(
        '[actview] 组件渲染错误:',
        expect.objectContaining({
          message: expect.stringContaining('ComboboxChipContext is missing'),
        }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});