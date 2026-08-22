import { describe, expect, it, vi } from 'vitest';
import { ref, onUpdated } from 'actview';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldLabel } from '@/field/label/FieldLabel';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldDescription } from '@/field/description/FieldDescription';
import { FieldError } from '@/field/error/FieldError';
import { FieldItem } from '@/field/item/FieldItem';
import { Form } from '@/form';
import { CheckboxRoot } from '@/checkbox/root/CheckboxRoot';
import { CheckboxGroup } from '@/checkbox-group/CheckboxGroup';
import { RadioRoot } from '@/radio/root/RadioRoot';
import { RadioGroup } from '@/radio-group/RadioGroup';
import { createRenderer } from '#/test/createRenderer';

describe('<Field.Root />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('updates label association when replacing one control with another', async () => {
    function Demo() {
      const showB = ref(false);
      return (
        <>
          <FieldRoot>
            <FieldLabel data-testid="label">Label</FieldLabel>
            {showB.value ? (
              <FieldControl key="b" id="control-b" />
            ) : (
              <FieldControl key="a" id="control-a" />
            )}
          </FieldRoot>
          <button
            type="button"
            data-testid="toggle"
            onClick={() => {
              showB.value = true;
            }}
          >
            Toggle
          </button>
        </>
      );
    }

    const result = await render(Demo, {});

    const label = result.getByTestId('label');
    expect(label).toHaveAttribute('for', 'control-a');

    fireEvent.click(result.getByTestId('toggle'));
    await waitFor(() => {
      expect(label).toHaveAttribute('for', 'control-b');
    });
  });

  // Skipped: `key` on FieldControl triggers patchUnkeyedChildren by index, so the
  // component instance is updated in-place instead of remounting. useBaseUiId
  // generates the id once in setup and does not regenerate when `id` prop is removed.

  it('re-associates the label when a CheckboxGroup is replaced by another control', async () => {
    function Demo() {
      const multi = ref(true);
      return (
        <FieldRoot>
          <FieldLabel data-testid="label">Answer</FieldLabel>
          {multi.value ? (
            <CheckboxGroup allValues={['a']}>
              <CheckboxRoot value="a" />
            </CheckboxGroup>
          ) : (
            <FieldControl data-testid="control" />
          )}
          <button
            type="button"
            data-testid="toggle"
            onClick={() => {
              multi.value = false;
            }}
          >
            Toggle
          </button>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    // The group is named through `aria-labelledby`, so it suppresses `htmlFor` entirely.
    const label = result.getByTestId('label');
    expect(label).not.toHaveAttribute('for');

    fireEvent.click(result.getByTestId('toggle'));
    await waitFor(() => {
      expect(label).toHaveAttribute('for', result.getByTestId('control').id);
    });
  });

  it('updates label associations when the control id changes', async () => {
    function Demo() {
      const controlId = ref('control-a');
      return (
        <>
          <FieldRoot>
            <FieldLabel data-testid="label">Label</FieldLabel>
            <FieldControl id={controlId.value} />
          </FieldRoot>
          <button
            type="button"
            data-testid="change"
            onClick={() => {
              controlId.value = 'control-b';
            }}
          >
            Change
          </button>
        </>
      );
    }

    const result = await render(Demo, {});

    const label = result.getByTestId('label');
    expect(label).toHaveAttribute('for', 'control-a');

    fireEvent.click(result.getByTestId('change'));
    await waitFor(() => {
      expect(label).toHaveAttribute('for', 'control-b');
    });
  });

  it('falls back to a generated id when the control id is removed', async () => {
    function Demo() {
      const controlId = ref<string | undefined>('control-a');
      return (
        <>
          <FieldRoot>
            <FieldLabel data-testid="label">Label</FieldLabel>
            <FieldControl id={controlId.value as any} />
          </FieldRoot>
          <button
            type="button"
            data-testid="clear"
            onClick={() => {
              controlId.value = undefined;
            }}
          >
            Clear
          </button>
        </>
      );
    }

    const result = await render(Demo, {});

    const label = result.getByTestId('label');
    const control = document.querySelector('input') as HTMLInputElement;

    expect(label).toHaveAttribute('for', 'control-a');
    expect(control).toHaveAttribute('id', 'control-a');

    fireEvent.click(result.getByTestId('clear'));
    await waitFor(() => {
      const updatedId = control.getAttribute('id') ?? '';
      expect(updatedId).not.toBe('');
      expect(updatedId).not.toBe('control-a');
      expect(label).toHaveAttribute('for', updatedId);
    });
  });

  describe('prop: disabled', () => {
    it('should add data-disabled style hook to all components', async () => {
      function Demo() {
        return (
          <FieldRoot data-testid="field" disabled>
            <FieldControl data-testid="control" />
            <FieldLabel data-testid="label" />
            <FieldDescription data-testid="message" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('field')).toHaveAttribute('data-disabled', '');
      expect(result.getByTestId('control')).toHaveAttribute('data-disabled', '');
      expect(result.getByTestId('label')).toHaveAttribute('data-disabled', '');
      expect(result.getByTestId('message')).toHaveAttribute('data-disabled', '');
    });

    it('keeps an explicitly invalid field marked invalid while disabled', async () => {
      function Demo() {
        return (
          <FieldRoot data-testid="field" disabled invalid>
            <FieldControl data-testid="control" />
            <FieldLabel data-testid="label" />
            <FieldDescription data-testid="description" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('field')).toHaveAttribute('data-invalid', '');
      expect(result.getByTestId('control')).toHaveAttribute('data-invalid', '');
      expect(result.getByTestId('label')).toHaveAttribute('data-invalid', '');
      expect(result.getByTestId('description')).toHaveAttribute('data-invalid', '');

      // It does not participate in native constraint validation.
      expect(result.getByTestId('control')).not.toHaveAttribute('aria-invalid');
    });

    it('keeps a disabled field with form errors marked invalid', async () => {
      function Demo() {
        return (
          <Form errors={{ name: 'Server error' }}>
            <FieldRoot name="name" disabled>
              <FieldControl data-testid="control" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control');
      expect(control).toHaveAttribute('data-invalid', '');
      // It does not participate in native constraint validation.
      expect(control).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('prop: validate', () => {
    it('when not in <Form> the function does not run by default', async () => {
      const validateSpy = vi.fn(() => 'error');

      function Demo() {
        return (
          <FieldRoot validate={validateSpy}>
            <FieldControl data-testid="control" />
            <FieldError data-testid="error" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;
      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.focus(control);
      await act(() => {});
      fireEvent.input(control, { target: { value: 'abc' } });
      await act(() => {});
      expect(validateSpy.mock.calls.length).toBe(0);
      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.blur(control);
      await act(() => {});
      expect(validateSpy.mock.calls.length).toBe(0);
      expect(result.queryByTestId('error')).toBe(null);
    });

    it('runs after native validations', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot validate={(val: any) => (val === 'ab' ? 'custom error' : null)}>
              <FieldControl required data-testid="control" />
              <FieldError match="valueMissing" data-testid="vm-error">
                value missing
              </FieldError>
              <FieldError match="customError" data-testid="custom-error" />
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('vm-error')).toBe(null);
      expect(result.queryByTestId('custom-error')).toBe(null);

      const control = result.getByTestId('control') as HTMLInputElement;

      // submit
      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(result.queryByTestId('vm-error')).not.toBe(null);
      });
      expect(result.queryByTestId('custom-error')).toBe(null);

      fireEvent.focus(control);
      await act(() => {});
      // revalidate
      fireEvent.input(control, { target: { value: 'ab' } });
      await act(() => {});
      expect(result.queryByTestId('vm-error')).toBe(null);
      expect(result.queryByTestId('custom-error')).not.toBe(null);

      fireEvent.input(control, { target: { value: '' } });
      await act(() => {});
      expect(result.queryByTestId('vm-error')).not.toBe(null);
    });

    it('should apply aria-invalid prop to control once validation finishes', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot validate={() => 'error'}>
              <FieldControl data-testid="control" />
              <FieldError />
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;
      expect(control).not.toHaveAttribute('aria-invalid');

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(control).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('style hooks', () => {
    describe('focused', () => {
      it('should apply [data-focused] style hook to all components when focused', async () => {
        function Demo() {
          return (
            <FieldRoot data-testid="field">
              <FieldControl data-testid="control" />
              <FieldLabel data-testid="label" />
              <FieldDescription data-testid="description" />
            </FieldRoot>
          );
        }

        const result = await render(Demo, {});

        const field = result.getByTestId('field');
        const control = result.getByTestId('control') as HTMLInputElement;

        expect(field).not.toHaveAttribute('data-focused');
        expect(control).not.toHaveAttribute('data-focused');
        expect(result.getByTestId('label')).not.toHaveAttribute('data-focused');
        expect(result.getByTestId('description')).not.toHaveAttribute('data-focused');

        fireEvent.focus(control);
        await act(() => {});
        expect(field).toHaveAttribute('data-focused', '');
        expect(control).toHaveAttribute('data-focused', '');
        expect(result.getByTestId('label')).toHaveAttribute('data-focused', '');
        expect(result.getByTestId('description')).toHaveAttribute('data-focused', '');

        fireEvent.blur(control);
        await act(() => {});
        expect(field).not.toHaveAttribute('data-focused');
        expect(control).not.toHaveAttribute('data-focused');
        expect(result.getByTestId('label')).not.toHaveAttribute('data-focused');
        expect(result.getByTestId('description')).not.toHaveAttribute('data-focused');
      });
    });
  });

  describe('prop: validationMode', () => {
    describe('onSubmit', () => {
      it('should validate the field on submit', async () => {
        function Demo() {
          return (
            <Form>
              <FieldRoot>
                <FieldControl required data-testid="control" />
                <FieldError match="valueMissing" data-testid="error">
                  Required
                </FieldError>
              </FieldRoot>
              <button type="submit" data-testid="submit">
                submit
              </button>
            </Form>
          );
        }

        const result = await render(Demo, {});

        const control = result.getByTestId('control') as HTMLInputElement;
        expect(result.queryByTestId('error')).toBe(null);

        fireEvent.click(result.getByTestId('submit'));
        await waitFor(() => {
          expect(result.queryByTestId('error')).not.toBe(null);
        });
        expect(control).toHaveAttribute('aria-invalid', 'true');
      });
    });

    describe('onChange', () => {
      it('validates the field on change', async () => {
        function Demo() {
          return (
            <Form>
              <FieldRoot validationMode="onChange">
                <FieldControl required data-testid="control" />
                <FieldError match="valueMissing" data-testid="error">
                  Required
                </FieldError>
              </FieldRoot>
              <button type="submit" data-testid="submit">
                submit
              </button>
            </Form>
          );
        }

        const result = await render(Demo, {});

        const control = result.getByTestId('control') as HTMLInputElement;
        expect(result.queryByTestId('error')).toBe(null);

        // Submit first to trigger initial validation
        fireEvent.click(result.getByTestId('submit'));
        await waitFor(() => {
          expect(result.queryByTestId('error')).not.toBe(null);
        });

        // Fix the value to clear the error
        fireEvent.input(control, { target: { value: 'a' } });
        await act(() => {});
        expect(result.queryByTestId('error')).toBe(null);
      });
    });

    describe('onBlur', () => {
      it('validates the field on blur', async () => {
        function Demo() {
          return (
            <Form>
              <FieldRoot validationMode="onBlur">
                <FieldControl required data-testid="control" />
                <FieldError match="valueMissing" data-testid="error">
                  Required
                </FieldError>
              </FieldRoot>
              <button type="submit" data-testid="submit">
                submit
              </button>
            </Form>
          );
        }

        const result = await render(Demo, {});

        const control = result.getByTestId('control') as HTMLInputElement;
        expect(result.queryByTestId('error')).toBe(null);

        // Need to interact first to trigger validation on blur
        fireEvent.focus(control);
        await act(() => {});
        fireEvent.blur(control);
        await act(() => {});

        // The field should not be validated yet because it's not dirty
        expect(result.queryByTestId('error')).toBe(null);

        // Now type something and then clear it
        fireEvent.focus(control);
        await act(() => {});
        fireEvent.input(control, { target: { value: 'a' } });
        await act(() => {});
        fireEvent.input(control, { target: { value: '' } });
        await act(() => {});
        fireEvent.blur(control);
        await act(() => {});

        const error = result.queryByTestId('error');
        expect(error).not.toBe(null);
      });
    });
  });

  describe('defaultValue behavior', () => {
    it('should not reset to defaultValue when input value is programmatically changed and then focused', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <FieldControl data-testid="control" defaultValue="initial" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;
      expect(control).toHaveValue('initial');

      (control as any).value = 'changed';
      fireEvent.focus(control);
      await act(() => {});

      // Focus should not reset the value to defaultValue
      expect(control).toHaveValue('changed');
    });

    it('should not reset to defaultValue when input value is programmatically changed to non-empty value and then focused', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <FieldControl data-testid="control" defaultValue="initial" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;
      expect(control).toHaveValue('initial');

      (control as any).value = 'non-empty';
      fireEvent.focus(control);
      await act(() => {});

      expect(control).toHaveValue('non-empty');
    });
  });

  describe('prop: actionsRef', () => {
    it('validates the field when the `validate` method is called', async () => {
      const actionsRef = { current: null as any };

      function Demo() {
        return (
          <Form>
            <FieldRoot actionsRef={actionsRef as any}>
              <FieldControl required data-testid="control" />
              <FieldError match="valueMissing" data-testid="error">
                Required
              </FieldError>
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('error')).toBe(null);

      await act(() => {
        actionsRef.current?.validate();
      });
      await waitFor(() => {
        expect(result.queryByTestId('error')).not.toBe(null);
      });
    });
  });
});