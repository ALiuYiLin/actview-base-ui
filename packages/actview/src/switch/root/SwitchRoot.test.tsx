import { describe, expect, it, vi } from 'vitest';
import { SwitchRoot } from '@/switch/root/SwitchRoot';
import { SwitchThumb } from '@/switch/thumb/SwitchThumb';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldLabel } from '@/field/label/FieldLabel';
import { FieldDescription } from '@/field/description/FieldDescription';
import { FieldError } from '@/field/error/FieldError';
import { Form } from '@/form';
import { createRenderer } from '#/test/createRenderer';
import { ref } from 'actview';

describe('<Switch.Root />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders a span element (refInstanceof: HTMLSpanElement)', async () => {
    function Demo() {
      return <SwitchRoot data-testid="switch" />;
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('switch')).toBeInstanceOf(HTMLSpanElement);
  });

  describe('interactions', () => {
    it('should change its state when clicked', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" />;
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should update its state when changed from outside', async () => {
      function Demo() {
        const checked = ref(false);
        return (
          <>
            <button
              type="button"
              data-testid="toggle"
              onClick={() => {
                checked.value = !checked.value;
              }}
            >
              Toggle
            </button>
            <SwitchRoot data-testid="switch" checked={checked.value} />
          </>
        );
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');
      const button = result.getByTestId('toggle');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(button);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(button);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('should update its state if the underlying input is toggled', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');
      const internalInput = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(internalInput);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('ignores a hidden input click canceled before it is handled', async () => {
      const handleCheckedChange = vi.fn();

      function Demo() {
        return <SwitchRoot data-testid="switch" onCheckedChange={handleCheckedChange} />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');
      const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      event.preventDefault();

      input.dispatchEvent(event);

      expect(handleCheckedChange).not.toHaveBeenCalled();
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('extra props', () => {
    it('should override the built-in attributes', async () => {
      function Demo() {
        return <SwitchRoot role="checkbox" data-testid="switch" />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).toHaveAttribute('role', 'checkbox');
    });

    it('sets `aria-labelledby` from a sibling label associated with the hidden input', async () => {
      function Demo() {
        return (
          <div>
            <label for="switch-input">Label</label>
            <SwitchRoot id="switch-input" />
          </div>
        );
      }

      const result = await render(Demo, {});
      const label = result.getByText('Label');
      expect(label.id).not.toBe('');
      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).toHaveAttribute('aria-labelledby', label.id);
    });

    it('updates fallback `aria-labelledby` when the hidden input id changes', async () => {
      function Demo() {
        const id = ref('switch-input-a');
        return (
          <>
            <label for="switch-input-a">Label A</label>
            <label for="switch-input-b">Label B</label>
            <SwitchRoot id={id.value} />
            <button
              type="button"
              data-testid="toggle"
              onClick={() => {
                id.value = 'switch-input-b';
              }}
            >
              Toggle
            </button>
          </>
        );
      }

      const result = await render(Demo, {});

      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
      const labelA = result.getByText('Label A');

      expect(labelA.id).not.toBe('');
      expect(switchEl).toHaveAttribute('aria-labelledby', labelA.id);

      fireEvent.click(result.getByTestId('toggle'));
      await act(() => {});

      await waitFor(() => {
        const labelB = result.getByText('Label B');
        expect(labelB.id).not.toBe('');
        expect(labelA.id).not.toBe(labelB.id);
        expect(switchEl).toHaveAttribute('aria-labelledby', labelB.id);
      });
    });
  });

  describe('prop: onCheckedChange', () => {
    it('should call onCheckedChange when clicked', async () => {
      const handleChange = vi.fn();

      function Demo() {
        return <SwitchRoot data-testid="switch" onCheckedChange={handleChange} />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.calls[0][0]).toBe(true);
    });

    it('does not change state when canceled via a root click', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot
              data-testid="switch"
              onCheckedChange={(_, eventDetails: any) => eventDetails.cancel()}
            />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');
      const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      expect(input.checked).toBe(false);
      expect(switchEl).not.toHaveAttribute('data-dirty');
      expect(switchEl).not.toHaveAttribute('data-filled');
    });

    it('does not change state when canceled via a hidden input click', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot
              data-testid="switch"
              onCheckedChange={(_, eventDetails: any) => eventDetails.cancel()}
            />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');
      const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(input);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      expect(input.checked).toBe(false);
      expect(switchEl).not.toHaveAttribute('data-dirty');
      expect(switchEl).not.toHaveAttribute('data-filled');
    });
  });

  describe('prop: onClick', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();

      function Demo() {
        return <SwitchRoot data-testid="switch" onClick={handleClick} />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');

      fireEvent.click(switchEl);

      expect(handleClick.mock.calls.length).toBe(1);
    });

    it('propagates a single click event to ancestors per user click', async () => {
      const handleParentClick = vi.fn();

      function Demo() {
        return (
          <div onClick={handleParentClick}>
            <SwitchRoot data-testid="switch" />
          </div>
        );
      }

      const result = await render(Demo, {});

      fireEvent.click(result.getByTestId('switch'));
      await act(() => {});

      expect(handleParentClick).toHaveBeenCalledTimes(1);
      expect(result.getByTestId('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not propagate to ancestors when stopPropagation() is called', async () => {
      const handleParentClick = vi.fn();

      function Demo() {
        return (
          <div onClick={handleParentClick}>
            <SwitchRoot
              data-testid="switch"
              onClick={(event: any) => event.stopPropagation()}
            />
          </div>
        );
      }

      const result = await render(Demo, {});

      fireEvent.click(result.getByTestId('switch'));
      await act(() => {});

      expect(handleParentClick).toHaveBeenCalledTimes(0);
      expect(result.getByTestId('switch')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('prop: disabled', () => {
    it('uses aria-disabled instead of HTML disabled', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" disabled />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).not.toHaveAttribute('disabled');
      expect(result.getByTestId('switch')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not have the `disabled` attribute when `disabled` is not set', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).not.toHaveAttribute('disabled');
    });

    it('should not change its state when clicked', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" disabled />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: readOnly', () => {
    it('should have the `aria-readonly` attribute', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" readOnly />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).toHaveAttribute('aria-readonly', 'true');
    });

    it('should not have the aria attribute when `readOnly` is not set', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).not.toHaveAttribute('aria-readonly');
    });

    it('should not change its state when clicked', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" readOnly />;
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('should not change its state when its label is clicked', async () => {
      function Demo() {
        return (
          <label data-testid="label">
            <SwitchRoot data-testid="switch" readOnly />
          </label>
        );
      }

      const result = await render(Demo, {});
      const switchEl = result.getByTestId('switch');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(result.getByTestId('label'));
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: required', () => {
    it('should have the `aria-required` attribute', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" required />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).toHaveAttribute('aria-required', 'true');
    });

    it('should not have the aria attribute when `required` is not set', async () => {
      function Demo() {
        return <SwitchRoot data-testid="switch" />;
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).not.toHaveAttribute('aria-required');
    });
  });

  describe('prop: inputRef', () => {
    it('should be able to access the native input', async () => {
      const inputRef = { current: null as HTMLInputElement | null };

      function Demo() {
        return <SwitchRoot inputRef={inputRef as any} />;
      }

      await render(Demo, {});

      const internalInput = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(inputRef.current).toBe(internalInput);
    });
  });

  it('should place the style hooks on the root and the thumb', async () => {
    function Demo() {
      return (
        <SwitchRoot defaultChecked disabled readOnly required>
          <SwitchThumb data-testid="thumb" />
        </SwitchRoot>
      );
    }

    const result = await render(Demo, {});

    const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
    const thumb = result.getByTestId('thumb');

    expect(switchEl).toHaveAttribute('data-checked', '');
    expect(switchEl).toHaveAttribute('data-disabled', '');
    expect(switchEl).toHaveAttribute('data-readonly', '');
    expect(switchEl).toHaveAttribute('data-required', '');

    expect(thumb).toHaveAttribute('data-checked', '');
    expect(thumb).toHaveAttribute('data-disabled', '');
    expect(thumb).toHaveAttribute('data-readonly', '');
    expect(thumb).toHaveAttribute('data-required', '');
  });

  it('should set the name attribute only on the input', async () => {
    function Demo() {
      return <SwitchRoot name="switch-name" />;
    }

    await render(Demo, {});

    const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(input).toHaveAttribute('name', 'switch-name');
    expect(switchEl).not.toHaveAttribute('name');
  });

  it('should not set the value attribute by default', async () => {
    function Demo() {
      return <SwitchRoot />;
    }

    await render(Demo, {});

    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).not.toHaveAttribute('value');
  });

  it('should set the value attribute only on the input', async () => {
    function Demo() {
      return <SwitchRoot value="1" />;
    }

    await render(Demo, {});

    const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(input).toHaveAttribute('value', '1');
    expect(switchEl).not.toHaveAttribute('value');
  });

  describe('with native <label>', () => {
    it('should toggle the switch when a wrapping <label> is clicked', async () => {
      function Demo() {
        return (
          <label data-testid="label">
            <SwitchRoot data-testid="switch" />
            Toggle
          </label>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(result.getByTestId('label'));
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should toggle the switch when an explicitly linked <label> is clicked', async () => {
      function Demo() {
        return (
          <div>
            <label data-testid="label" for="mySwitch">
              Toggle
            </label>
            <SwitchRoot id="mySwitch" />
          </div>
        );
      }

      const result = await render(Demo, {});

      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(result.getByTestId('label'));
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should associate `id` with the native button when `nativeButton=true`', async () => {
      function Demo() {
        return (
          <div>
            <label data-testid="label" for="mySwitch">
              Toggle
            </label>
            <SwitchRoot id="mySwitch" nativeButton render={<button />} />
          </div>
        );
      }

      const result = await render(Demo, {});

      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).toHaveAttribute('id', 'mySwitch');

      const hiddenInput = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(hiddenInput).not.toHaveAttribute('id', 'mySwitch');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(result.getByTestId('label'));
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Form', () => {
    it('triggers native HTML validation on submit', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot name="test">
              <SwitchRoot name="switch" required />
              <FieldError match="valueMissing" data-testid="error">
                required
              </FieldError>
            </FieldRoot>
            <button type="submit" data-testid="submit">
              Submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.click(result.getByTestId('submit'));
      await act(() => {});

      await waitFor(() => {
        const error = result.queryByTestId('error');
        expect(error).not.toBe(null);
        expect(error).toHaveTextContent('required');
      });
    });

    it('clears external errors on change', async () => {
      function Demo() {
        return (
          <Form errors={{ test: 'test' }}>
            <FieldRoot name="test" data-testid="field">
              <SwitchRoot data-testid="switch" />
              <FieldError data-testid="error" />
            </FieldRoot>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
      expect(result.queryByTestId('error')).toHaveTextContent('test');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).not.toHaveAttribute('aria-invalid');
      expect(result.queryByTestId('error')).toBe(null);
    });
  });

  describe('Field', () => {
    it('should receive disabled prop from Field.Root', async () => {
      function Demo() {
        return (
          <FieldRoot disabled>
            <SwitchRoot data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('switch')).toHaveAttribute('data-disabled');
    });

    it('should receive name prop from Field.Root', async () => {
      function Demo() {
        return (
          <FieldRoot name="field-switch">
            <SwitchRoot />
          </FieldRoot>
        );
      }

      await render(Demo, {});

      const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(input).toHaveAttribute('name', 'field-switch');
    });

    it('[data-touched]', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      fireEvent.focus(switchEl);
      fireEvent.blur(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('data-touched', '');
    });

    it('[data-dirty]', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      expect(switchEl).not.toHaveAttribute('data-dirty');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('data-dirty', '');
    });

    describe('[data-filled]', () => {
      it('adds [data-filled] attribute when checked after being initially unchecked', async () => {
        function Demo() {
          return (
            <FieldRoot>
              <SwitchRoot data-testid="switch" />
            </FieldRoot>
          );
        }

        const result = await render(Demo, {});

        const switchEl = result.getByTestId('switch');

        expect(switchEl).not.toHaveAttribute('data-filled');

        fireEvent.click(switchEl);
        await act(() => {});

        expect(switchEl).toHaveAttribute('data-filled', '');

        fireEvent.click(switchEl);
        await act(() => {});

        expect(switchEl).not.toHaveAttribute('data-filled');
      });

      it('removes [data-filled] attribute when unchecked after being initially checked', async () => {
        function Demo() {
          return (
            <FieldRoot>
              <SwitchRoot data-testid="switch" defaultChecked />
            </FieldRoot>
          );
        }

        const result = await render(Demo, {});

        const switchEl = result.getByTestId('switch');

        expect(switchEl).toHaveAttribute('data-filled');

        fireEvent.click(switchEl);
        await act(() => {});

        expect(switchEl).not.toHaveAttribute('data-filled', '');
      });
    });

    it('[data-focused]', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      expect(switchEl).not.toHaveAttribute('data-focused');

      fireEvent.focus(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('data-focused', '');

      fireEvent.blur(switchEl);
      await act(() => {});

      expect(switchEl).not.toHaveAttribute('data-focused');
    });

    it('does not set [data-focused] when disabled', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot disabled data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      fireEvent.focus(switchEl);
      await act(() => {});

      expect(switchEl).not.toHaveAttribute('data-focused');
    });

    it('prop: validationMode=onSubmit', async () => {
      function Demo() {
        return (
          <Form>
            <FieldRoot>
              <SwitchRoot required />
              <FieldError data-testid="error" />
            </FieldRoot>
            <button type="submit" data-testid="submit">
              submit
            </button>
          </Form>
        );
      }

      const result = await render(Demo, {});

      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).not.toHaveAttribute('aria-invalid');

      fireEvent.click(result.getByTestId('submit'));
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
      expect(result.queryByTestId('error')).not.toBe(null);

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).not.toHaveAttribute('aria-invalid');
      expect(result.queryByTestId('error')).toBe(null);

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
      expect(result.queryByTestId('error')).not.toBe(null);
    });

    it('prop: validationMode=onChange', async () => {
      function Demo() {
        return (
          <FieldRoot
            validationMode="onChange"
            validate={(value: any) => {
              const checked = value as boolean;
              return checked ? 'error' : null;
            }}
          >
            <SwitchRoot data-testid="switch" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      expect(switchEl).not.toHaveAttribute('aria-invalid');

      fireEvent.click(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
    });

    it('validates once when changed by the user', async () => {
      const validate = vi.fn();

      function Demo() {
        return (
          <FieldRoot validationMode="onChange" validate={validate}>
            <SwitchRoot />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = document.querySelector('[role="switch"]') as HTMLElement;

      fireEvent.click(switchEl!);
      await act(() => {});

      expect(validate).toHaveBeenCalledTimes(1);
      expect(validate.mock.lastCall?.[0]).toBe(true);
    });

    it('revalidates when a controlled value changes externally', async () => {
      const validateSpy = vi.fn((value: unknown) => ((value as boolean) ? 'error' : null));

      function Demo() {
        const checked = ref(false);
        return (
          <>
            <FieldRoot validationMode="onChange" validate={validateSpy} name="newsletters">
              <SwitchRoot
                data-testid="switch"
                checked={checked.value}
                onCheckedChange={(v: boolean) => {
                  checked.value = v;
                }}
              />
            </FieldRoot>
            <button
              type="button"
              data-testid="toggle"
              onClick={() => {
                checked.value = !checked.value;
              }}
            >
              Toggle externally
            </button>
          </>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');
      const toggle = result.getByTestId('toggle');

      expect(switchEl).not.toHaveAttribute('aria-invalid');
      const initialCallCount = validateSpy.mock.calls.length;

      fireEvent.click(toggle);
      await act(() => {});

      expect(validateSpy.mock.calls.length).toBe(initialCallCount + 1);
      expect(validateSpy.mock.lastCall?.[0]).toBe(true);
      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
    });

    it('prop: validationMode=onBlur', async () => {
      function Demo() {
        return (
          <FieldRoot
            validationMode="onBlur"
            validate={(value: any) => {
              const checked = value as boolean;
              return checked ? 'error' : null;
            }}
          >
            <SwitchRoot data-testid="switch" />
            <FieldError data-testid="error" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const switchEl = result.getByTestId('switch');

      expect(switchEl).not.toHaveAttribute('aria-invalid');

      fireEvent.click(switchEl);
      await act(() => {});
      fireEvent.blur(switchEl);
      await act(() => {});

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
    });

    describe('Field.Label', () => {
      describe('implicit', () => {
        it('sets `for` on the label', async () => {
          function Demo() {
            return (
              <FieldRoot>
                <FieldLabel data-testid="label">
                  <SwitchRoot />
                  OK
                </FieldLabel>
              </FieldRoot>
            );
          }

          const result = await render(Demo, {});

          const label = result.getByTestId('label');
          expect(label.getAttribute('for')).not.toBe(null);

          const input = document.querySelector('input[type="checkbox"]');
          expect(label.getAttribute('for')).toBe(input?.getAttribute('id'));

          const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
          expect(switchEl.getAttribute('aria-labelledby')).toBe(label.getAttribute('id'));
          expect(switchEl).toHaveAttribute('aria-checked', 'false');

          fireEvent.click(label);
          await act(() => {});
          expect(switchEl).toHaveAttribute('aria-checked', 'true');
        });
      });

      describe('explicit association', () => {
        it('when the label is sibling to the switch', async () => {
          function Demo() {
            return (
              <FieldRoot>
                <FieldLabel data-testid="label">Label</FieldLabel>
                <SwitchRoot />
              </FieldRoot>
            );
          }

          const result = await render(Demo, {});

          const label = result.getByTestId('label');
          const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
          const input = document.querySelector('input[type="checkbox"]');

          expect(label.getAttribute('for')).not.toBe(null);
          expect(label.getAttribute('for')).toBe(input?.getAttribute('id'));
          expect(switchEl.getAttribute('aria-labelledby')).toBe(label.getAttribute('id'));

          expect(switchEl).toHaveAttribute('aria-checked', 'false');

          fireEvent.click(label);
          await act(() => {});
          expect(switchEl).toHaveAttribute('aria-checked', 'true');
        });

        it('when rendering a non-native button', async () => {
          function Demo() {
            return (
              <FieldRoot>
                <FieldLabel data-testid="label">OK</FieldLabel>
                <SwitchRoot render={<span />} nativeButton={false} />
              </FieldRoot>
            );
          }

          const result = await render(Demo, {});

          const label = result.getByTestId('label');
          expect(label.getAttribute('for')).not.toBe(null);
          const input = document.querySelector('input[type="checkbox"]');
          expect(input?.getAttribute('id')).toBe(label.getAttribute('for'));
          const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
          expect(switchEl.getAttribute('aria-labelledby')).toBe(label.getAttribute('id'));
        });

        it('when rendering a non-native label', async () => {
          function Demo() {
            return (
              <FieldRoot>
                <FieldLabel data-testid="label" render={<span />} nativeLabel={false}>
                  <SwitchRoot data-testid="switch" />
                </FieldLabel>
              </FieldRoot>
            );
          }

          const result = await render(Demo, {});

          const label = result.getByTestId('label');
          const switchEl = result.getByTestId('switch');

          expect(label.getAttribute('for')).toBe(null);
          expect(label.getAttribute('id')).not.toBe(null);

          expect(switchEl.getAttribute('aria-labelledby')).toBe(label.getAttribute('id'));
          expect(switchEl).toHaveAttribute('aria-checked', 'false');

          // non-native labels cannot toggle a non-native-button switch
          fireEvent.click(label);
          await act(() => {});
          expect(switchEl).not.toHaveAttribute('aria-checked', 'true');
        });
      });
    });

    it('Field.Description', async () => {
      function Demo() {
        return (
          <FieldRoot>
            <SwitchRoot data-testid="switch" aria-describedby="external-description" />
            <FieldDescription data-testid="description" />
          </FieldRoot>
        );
      }

      const result = await render(Demo, {});

      const internalInput = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const description = result.getByTestId('description');

      expect(internalInput).toHaveAttribute('aria-describedby', description.id);
      expect(result.getByTestId('switch')).toHaveAttribute(
        'aria-describedby',
        `external-description ${description.id}`,
      );
    });
  });

  it('can render a native button', async () => {
    function Demo() {
      return <SwitchRoot render={<button />} nativeButton />;
    }

    const result = await render(Demo, {});

    const switchEl = document.querySelector('[role="switch"]') as HTMLElement;
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(document.querySelector('button')).toBe(switchEl);

    fireEvent.click(switchEl);
    await act(() => {});

    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('tolerates imperative interaction in its ref callback before the hidden input mounts', async () => {
    function Demo() {
      const switchRef = ref<HTMLElement | null>(null);
      return (
        <SwitchRoot
          ref={switchRef}
          data-testid="switch"
        />
      );
    }

    const result = await render(Demo, {});
    const switchEl = result.getByTestId('switch');

    // Imperative interaction should work
    switchEl.focus();
    switchEl.blur();
    switchEl.click();

    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });
});
