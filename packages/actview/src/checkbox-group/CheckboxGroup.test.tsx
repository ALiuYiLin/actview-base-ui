import { describe, expect, it } from 'vitest';
import { CheckboxGroup } from '@/checkbox-group/CheckboxGroup';
import { FieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { LabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { FormContext } from '@/internals/form-context/FormContext';
import { createRenderer } from '../../test/createRenderer';

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

const labelableContext = {
  controlId: 'control-1',
  registerControlId: () => {},
  resetControlId: () => {},
  labelId: 'label-1',
  setLabelId: () => {},
  getDescriptionProps: (prev: any) => prev,
  setMessageIds: () => {},
  messageIds: [],
};

const formContext = {
  clearErrors: () => {},
  elementRef: { current: null },
  errors: {},
  validate: () => {},
};

describe('<CheckboxGroup />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <FormContext.Provider value={formContext}>
          <FieldRootContext.Provider value={fieldRootContext}>
            <LabelableContext.Provider value={labelableContext}>
              <span data-testid="marker">marker</span>
              <CheckboxGroup data-testid="group" />
            </LabelableContext.Provider>
          </FieldRootContext.Provider>
        </FormContext.Provider>
      );
    }

    const result = await render(Demo, {});
    console.log('container innerHTML:', result.container.innerHTML);
    const marker = result.getByTestId('marker');
    expect(marker).not.toBe(null);
    const group = result.getByTestId('group');
    expect(group).toBeInstanceOf(HTMLDivElement);
  });
});