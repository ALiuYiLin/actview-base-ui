import { describe, expect, it, vi } from 'vitest';
import { onUpdated, ref } from 'actview';
import { createElement } from '@actview/jsx';
import { FieldRoot } from '../root/FieldRoot';
import { FieldControl } from './FieldControl';
import { FieldError } from '../error/FieldError';
import { FieldLabel } from '../label/FieldLabel';
import { Form } from '../../form';
import { createRenderer } from '../../../test/createRenderer';

describe('<Field.Control />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('avoids rerendering for uncontrolled input changes', async () => {
    const renderCountRef = ref(0);

    function Demo() {
      onUpdated(()=>{
        renderCountRef.value++
      })
      return (
        <FieldRoot>
          <FieldControl
            data-testid="control"
          />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;
    const initialRenderCount = renderCountRef.value;

    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});
    const afterFirstChange = renderCountRef.value;

    fireEvent.input(control, { target: { value: 'ab' } });
    await act(() => {});
    fireEvent.input(control, { target: { value: 'abc' } });
    await act(() => {});

    expect(renderCountRef.value).toBe(afterFirstChange);
    expect(afterFirstChange).toBeLessThanOrEqual(initialRenderCount + 1);
  });

  it('renders once per keystroke for controlled input changes', async () => {
    const renderCountRef = ref(0);

    function Demo() {
      const value = ref('');
      onUpdated(()=>{
        renderCountRef.value ++
      })
      return (
        <FieldRoot>
          <FieldControl
            data-testid="control"
            value={value.value}
            onValueChange={(v: any) => {
              value.value = v;
            }}
          />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;

    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});
    const settledRenderCount = renderCountRef.value;

    fireEvent.input(control, { target: { value: 'ab' } });
    await act(() => {});
    fireEvent.input(control, { target: { value: 'abc' } });
    await act(() => {});

    // The controlled echo must not schedule a second render per keystroke.
    expect(renderCountRef.value).toBe(settledRenderCount + 2);
  });

  it('validates once when changed by the user', async () => {
    const validate = vi.fn();

    function Demo() {
      return (
        <FieldRoot validationMode="onChange" validate={validate}>
          <FieldControl data-testid="control" />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;

    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});

    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.lastCall?.[0]).toBe('a');
  });

  it('validates once when a controlled value is changed by the user', async () => {
    const validate = vi.fn(() => null);

    function Demo() {
      const value = ref('');
      return (
        <FieldRoot validationMode="onChange" validate={validate}>
          <FieldControl
            value={value.value}
            onValueChange={(v: any) => {
              value.value = v;
            }}
          />
        </FieldRoot>
      );
    }

    await render(Demo, {});

    const control = document.querySelector('input') as HTMLInputElement;

    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});

    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('clears dirty state when a numeric controlled value returns to its initial value', async () => {
    function Demo() {
      const value = ref(5);
      return (
        <FieldRoot data-testid="root">
          <FieldControl
            value={value.value}
            onValueChange={(v: any) => {
              value.value = Number(v);
            }}
          />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const root = result.getByTestId('root');
    const control = document.querySelector('input') as HTMLInputElement;

    expect(root).not.toHaveAttribute('data-dirty');

    fireEvent.input(control, { target: { value: '56' } });
    await act(() => {});
    expect(root).toHaveAttribute('data-dirty', '');

    fireEvent.input(control, { target: { value: '5' } });
    await act(() => {});
    expect(root).not.toHaveAttribute('data-dirty');
  });

  it('syncs state and validates when the controlled value changes programmatically', async () => {
    const validate = vi.fn((_value: unknown) => null);

    function Demo() {
      const value = ref('');
      return (
        <FieldRoot data-testid="root" validationMode="onChange" validate={validate}>
          <FieldControl
            value={value.value}
            onValueChange={(v: any) => {
              value.value = v;
            }}
          />
          <button
            type="button"
            data-testid="set-btn"
            onClick={() => {
              value.value = 'external';
            }}
          >
            set
          </button>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    fireEvent.click(result.getByTestId('set-btn'));
    await act(() => {});

    const root = result.getByTestId('root');

    expect(root).toHaveAttribute('data-filled', '');
    expect(root).toHaveAttribute('data-dirty', '');
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.lastCall?.[0]).toBe('external');
  });

  it('sets filled state on mount when the control is prefilled', async () => {
    function Demo() {
      return (
        <FieldRoot data-testid="root">
          <FieldControl defaultValue="foo" />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('root')).toHaveAttribute('data-filled', '');
  });

  it('does not set filled state on mount for an empty controlled value', async () => {
    function Demo() {
      return (
        <FieldRoot data-testid="root">
          <FieldControl value="" onValueChange={() => {}} />
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('root')).not.toHaveAttribute('data-filled');
  });

  it('does not validate when the change is canceled', async () => {
    const validate = vi.fn(() => null);

    function Demo() {
      return (
        <FieldRoot validationMode="onChange" validate={validate}>
          <FieldControl
            onValueChange={(value: any, details: any) => {
              details.cancel();
            }}
          />
        </FieldRoot>
      );
    }

    await render(Demo, {});

    const control = document.querySelector('input') as HTMLInputElement;
    fireEvent.input(control, { target: { value: 'a' } });
    await act(() => {});

    expect(validate).not.toHaveBeenCalled();
  });

  it('does not clear errors or validate when change is prevented', async () => {
    const validate = vi.fn();
    const handleValueChange = vi.fn();

    function Demo() {
      return (
        <Form errors={{ message: 'Server error' }}>
          <FieldRoot name="message" validationMode="onChange" validate={validate}>
            <FieldControl onValueChange={handleValueChange} />
            <FieldError />
          </FieldRoot>
        </Form>
      );
    }

    await render(Demo, {});

    const control = document.querySelector('input') as HTMLInputElement;
    control.addEventListener('input', (event: Event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    fireEvent.input(control, { cancelable: true, target: { value: 'a' } });
    await act(() => {});

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
  });

  it('shows a required error when a prefilled value is cleared', async () => {
    function Demo() {
      const value = ref('value');
      return (
        <Form>
          <FieldRoot validationMode="onChange">
            <FieldControl
              data-testid="control"
              value={value.value}
              onValueChange={(v: any) => {
                value.value = v;
              }}
              required
            />
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

    // Clear the prefilled value
    fireEvent.input(control, { target: { value: '' } });
    await act(() => {});

    // Submit to trigger validation
    fireEvent.click(result.getByTestId('submit'));
    await waitFor(() => {
      expect(result.queryByTestId('error')).not.toBe(null);
    });

    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  describe('id', () => {
    it('updates the label association when the control is swapped', async () => {
      function Demo() {
        const controlKey = ref('a');
        return (
          <>
            <FieldRoot>
              <FieldLabel data-testid="label">Label</FieldLabel>
              <FieldControl key={controlKey.value} id={controlKey.value} data-testid="control" />
            </FieldRoot>
            <button
              type="button"
              data-testid="swap-btn"
              onClick={() => {
                controlKey.value = 'b';
              }}
            >
              swap
            </button>
          </>
        );
      }

      const result = await render(Demo, {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'a');

      fireEvent.click(result.getByTestId('swap-btn'));
      await act(() => {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'b');
    });
  });
});
