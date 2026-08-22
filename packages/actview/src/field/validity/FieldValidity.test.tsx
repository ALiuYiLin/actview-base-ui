import { describe, expect, it, vi } from 'vitest';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldError } from '@/field/error/FieldError';
import { FieldValidity } from '@/field/validity/FieldValidity';
import { Form } from '@/form';
import { createRenderer } from '../../../test/createRenderer';

describe('<Field.Validity />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  describe('validationMode=onSubmit', () => {
    it('should pass validity data', async () => {
      const handleValidity = vi.fn();

      function Demo() {
        return (
          <Form>
            <FieldRoot>
              <FieldControl required data-testid="control" />
              <FieldValidity>{handleValidity as any}</FieldValidity>
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;

      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(null);

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(false);
      });

      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(true);
      expect(handleValidity.mock.lastCall?.[0]).toHaveProperty('transitionStatus');

      fireEvent.focus(control);
      fireEvent.input(control, { target: { value: 'test' } });
      await act(() => {});

      expect(handleValidity.mock.lastCall?.[0].value).toBe('test');
      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(false);
    });
  });

  describe('validationMode=onBlur', () => {
    it('should pass validity data', async () => {
      const handleValidity = vi.fn();

      function Demo() {
        return (
          <FieldRoot validationMode="onBlur">
            <FieldControl required data-testid="control" />
            <FieldValidity>{handleValidity as any}</FieldValidity>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;

      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(null);

      fireEvent.focus(control);
      fireEvent.input(control, { target: { value: 'test' } });
      await act(() => {});
      fireEvent.blur(control);
      await act(() => {});

      expect(handleValidity.mock.lastCall?.[0].value).toBe('test');
      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(false);
    });

    it('should correctly pass errors when validate function returns a string', async () => {
      const handleValidity = vi.fn();
      const validate = vi.fn(() => 'error');

      function Demo() {
        return (
          <FieldRoot validationMode="onBlur" validate={validate}>
            <FieldControl data-testid="control" />
            <FieldValidity>{handleValidity as any}</FieldValidity>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;

      fireEvent.focus(control);
      await act(() => {});
      fireEvent.blur(control);
      await act(() => {});

      expect(handleValidity.mock.lastCall?.[0].error).toBe('error');
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual(['error']);
    });

    it('should correctly pass errors when validate function returns an array of strings', async () => {
      const handleValidity = vi.fn();
      const validate = vi.fn(() => ['1', '2']);

      function Demo() {
        return (
          <FieldRoot validationMode="onBlur" validate={validate}>
            <FieldControl data-testid="control" />
            <FieldValidity>{handleValidity as any}</FieldValidity>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;

      fireEvent.focus(control);
      await act(() => {});
      fireEvent.blur(control);
      await act(() => {});

      expect(handleValidity.mock.lastCall?.[0].error).toBe('1');
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual(['1', '2']);
    });
  });
});