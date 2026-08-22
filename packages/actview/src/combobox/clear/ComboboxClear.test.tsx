import { describe, expect, it } from 'vitest';
import { ComboboxClear } from '@/combobox/clear/ComboboxClear';
import { ComboboxRootContext, ComboboxInputValueContext } from '@/combobox/root/ComboboxRootContext';
import { FieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { createRenderer } from '#/test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      selectionMode: 'single',
      disabled: false,
      readOnly: false,
      open: false,
      selectedValue: 'test',
      hasSelectionChips: false,
    };
    return { value: values[key] };
  },
  state: {
    clearRef: { current: null },
    inputRef: { current: null },
    keyboardActiveRef: { current: false },
    setInputValue: () => {},
    setSelectedValue: () => {},
    setIndices: () => {},
  },
  set: () => {},
} as any;

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

describe('<Combobox.Clear />', () => {
  const { render } = createRenderer();

  it('renders a button element', async () => {
    function Demo() {
      return (
        <FieldRootContext.Provider value={fieldRootContext}>
          <ComboboxRootContext.Provider value={mockStore}>
            <ComboboxInputValueContext.Provider value="test">
              <ComboboxClear data-testid="clear" />
            </ComboboxInputValueContext.Provider>
          </ComboboxRootContext.Provider>
        </FieldRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('clear');
    expect(el).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders when a value is selected', async () => {
    function Demo() {
      return (
        <FieldRootContext.Provider value={fieldRootContext}>
          <ComboboxRootContext.Provider value={mockStore}>
            <ComboboxInputValueContext.Provider value="test">
              <ComboboxClear data-testid="clear" />
            </ComboboxInputValueContext.Provider>
          </ComboboxRootContext.Provider>
        </FieldRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('clear');
    expect(el).not.toBe(null);
  });
});