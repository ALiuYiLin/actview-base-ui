import { describe, expect, it } from 'vitest';
import { ComboboxLabel } from './ComboboxLabel';
import { ComboboxRootContext } from '../root/ComboboxRootContext';
import { FieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      inputInsidePopup: false,
      triggerElement: { value: { id: 'trigger-1' } },
      inputElement: { value: null },
      id: 'combobox-1',
    };
    return { value: values[key] };
  },
  state: {},
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

describe('<Combobox.Label />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <FieldRootContext.Provider value={fieldRootContext}>
          <ComboboxRootContext.Provider value={mockStore}>
            <ComboboxLabel data-testid="label" />
          </ComboboxRootContext.Provider>
        </FieldRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('label');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});