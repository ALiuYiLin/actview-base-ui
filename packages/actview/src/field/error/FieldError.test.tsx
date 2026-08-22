import { describe, expect, it, vi } from 'vitest';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldError } from '@/field/error/FieldError';
import { Form } from '@/form';
import { createRenderer } from '../../../test/createRenderer';

describe('<Field.Error />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('should show error messages by default', async () => {
    function Demo() {
      return (
        <Form>
          <FieldRoot>
            <FieldControl required data-testid="control" />
            <FieldError data-testid="error">Message</FieldError>
          </FieldRoot>
          <button type="submit" data-testid="submit">
            submit
          </button>
        </Form>
      );
    }

    const result = await render(Demo, {});

    expect(result.queryByTestId('error')).toBe(null);

    const control = result.getByTestId('control') as HTMLInputElement;

    fireEvent.focus(control);
    await act(() => {});
    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});
    fireEvent.input(control, { target: { value: '' } });
    await act(() => {});
    fireEvent.blur(control);
    await act(() => {});
    expect(result.queryByTestId('error')).toBe(null);

    fireEvent.click(result.getByTestId('submit'));
    await waitFor(() => {
      expect(result.queryByTestId('error')).not.toBe(null);
    });
  });

  describe('prop: match', () => {
    it('should only render when `match` matches constraint validation', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot>
              <FieldControl required minLength={2} data-testid="control" />
              <FieldError match="valueMissing" data-testid="error">
                Message
              </FieldError>
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(result.queryByTestId('error')).not.toBe(null);
      });

      const control = result.getByTestId('control') as HTMLInputElement;

      fireEvent.focus(control);
      await act(() => {});
      fireEvent.input(control, { target: { value: 'a' } });
      await act(() => {});
      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.input(control, { target: { value: '' } });
      await act(() => {});
      expect(result.queryByTestId('error')).not.toBe(null);
    });

    it('should show custom errors', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot validate={() => 'error'}>
              <FieldControl data-testid="control" />
              <FieldError match="customError" data-testid="error">
                Message
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

      fireEvent.focus(control);
      await act(() => {});
      fireEvent.input(control, { target: { value: 'a' } });
      await act(() => {});
      fireEvent.blur(control);
      await act(() => {});
      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(result.queryByTestId('error')).not.toBe(null);
      });
    });

    it('uses `match={false}` as the default slot for Form errors', async () => {
      function Demo() {
        return (
          <Form errors={{ username: 'Username is reserved' }}>
            <FieldRoot name="username">
              <FieldControl defaultValue="admin" required minLength={8} pattern="[a-z]+" />
              <FieldError match="valueMissing">Username is required.</FieldError>
              <FieldError match="tooShort">Username must be at least 8 characters.</FieldError>
              <FieldError match="patternMismatch">
                Username can only include lowercase letters.
              </FieldError>
              <FieldError match={false} data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByText('Username is required.')).toBe(null);
      expect(result.queryByText('Username must be at least 8 characters.')).toBe(null);
      expect(result.queryByText('Username can only include lowercase letters.')).toBe(null);
      expect(result.getByTestId('default-error')).toHaveTextContent('Username is reserved');
    });

    it('uses an omitted `match` as the default slot for Form errors', async () => {
      function Demo() {
        return (
          <Form errors={{ username: 'Username is reserved' }}>
            <FieldRoot name="username">
              <FieldControl defaultValue="admin" required minLength={8} pattern="[a-z]+" />
              <FieldError match="valueMissing">Username is required.</FieldError>
              <FieldError match="tooShort">Username must be at least 8 characters.</FieldError>
              <FieldError match="patternMismatch">
                Username can only include lowercase letters.
              </FieldError>
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByText('Username is required.')).toBe(null);
      expect(result.queryByText('Username must be at least 8 characters.')).toBe(null);
      expect(result.queryByText('Username can only include lowercase letters.')).toBe(null);
      expect(result.getByTestId('default-error')).toHaveTextContent('Username is reserved');
    });

    it('uses the Field.Control name fallback for Form errors', async () => {
      function Demo() {
        return (
          <Form errors={{ email: 'Email is already taken' }}>
            <FieldRoot>
              <FieldControl name="email" data-testid="control" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;

      expect(control).toHaveAttribute('aria-invalid', 'true');
      expect(result.getByTestId('default-error')).toHaveTextContent('Email is already taken');

      fireEvent.input(control, { target: { value: 'next@example.com' } });
      await act(() => {});

      expect(control).not.toHaveAttribute('aria-invalid');
      expect(result.queryByTestId('default-error')).toBe(null);
    });

    it('ignores inherited Form error properties', async () => {
      function Demo() {
        return (
          <Form errors={{}}>
            <FieldRoot name="constructor">
              <FieldControl data-testid="control" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('control')).not.toHaveAttribute('aria-invalid');
      expect(result.queryByTestId('default-error')).toBe(null);
    });

    it('renders Form error arrays as a list', async () => {
      function Demo() {
        return (
          <Form errors={{ username: ['Username is reserved', 'Username is too short'] }}>
            <FieldRoot name="username">
              <FieldControl defaultValue="admin" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const list = result.getByTestId('default-error').querySelector('ul');
      expect(list).not.toBe(null);
      expect(list?.querySelectorAll('li')).toHaveLength(2);
      expect(result.getByText('Username is reserved')).not.toBe(null);
      expect(result.getByText('Username is too short')).not.toBe(null);
    });

    it('renders single-item Form error arrays as text', async () => {
      function Demo() {
        return (
          <Form errors={{ username: ['Username is reserved'] }}>
            <FieldRoot name="username">
              <FieldControl defaultValue="admin" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('default-error').querySelector('ul')).toBe(null);
      expect(result.getByTestId('default-error')).toHaveTextContent('Username is reserved');
    });

    it('renders client validation error arrays as a list', async () => {
      function Demo() {
        return (
          <Form errors={{ username: ['First error', 'Second error'] }}>
            <FieldRoot name="username">
              <FieldControl />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const list = result.getByTestId('default-error').querySelector('ul');
      expect(list).not.toBe(null);
      expect(list?.querySelectorAll('li')).toHaveLength(2);
      expect(result.getByText('First error')).not.toBe(null);
      expect(result.getByText('Second error')).not.toBe(null);
    });

    it('does not register an empty error id', async () => {
      function Demo() {
        return (
          <FieldRoot invalid>
            <FieldControl aria-describedby="external-description" data-testid="control" />
            <FieldError id="" match>Message</FieldError>
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const control = result.getByTestId('control') as HTMLInputElement;
      expect(control).toHaveAttribute('aria-describedby', 'external-description');
    });

    it('ignores empty Form error arrays', async () => {
      function Demo() {
        return (
          <Form errors={{ username: [] }}>
            <FieldRoot name="username">
              <FieldControl defaultValue="admin" data-testid="control" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('default-error')).toBe(null);
      expect(result.getByTestId('control')).not.toHaveAttribute('aria-invalid');
    });

    it('uses `match={false}` as the default slot for client validation errors', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot>
              <FieldControl required />
              <FieldError match={false} data-testid="default-error" />
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('default-error')).toBe(null);

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(result.getByTestId('default-error')).not.toBe(null);
      });
    });

    it('uses the client validation path for specific matches when Form errors are present', async () => {
      function Demo() {
        return (
          <Form errors={{ username: 'Username is reserved' }}>
            <FieldRoot name="username" validate={() => 'Client validation error'}>
              <FieldControl />
              <FieldError match="customError" data-testid="custom-error" />
              <FieldError data-testid="default-error" />
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      fireEvent.click(result.getByTestId('submit'));
      await waitFor(() => {
        expect(result.getByTestId('custom-error')).toHaveTextContent('Client validation error');
      });
      expect(result.getByTestId('custom-error')).not.toHaveTextContent('Username is reserved');
      expect(result.getByTestId('default-error')).toHaveTextContent('Username is reserved');
    });
  });
});