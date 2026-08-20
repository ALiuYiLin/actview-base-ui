import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioGroup';
import { createRenderer } from '../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

describe('<RadioGroup />', () => {
  // React 原版 conformance（refInstanceof HTMLDivElement）——actview 无此基建，不移植

  describe('extra props', () => {
    it('can override the built-in attributes', async () => {
      const result = await render(RadioGroup, { role: 'switch' });
      expect(result.container.firstElementChild).toHaveAttribute('role', 'switch');
    });
  });

  describe('prop: id', () => {
    it('is forwarded to the root element', async () => {
      await render(RadioGroup, { id: 'group-id' });
      expect(document.querySelector('[role="radiogroup"]')).toHaveAttribute('id', 'group-id');
    });
  });

  describe('prop: disabled', () => {
    // React 原版完整用例（含 Radio.Root 子件断言）见下方 TODO refactor component 块。
    // 此处激活不依赖 Radio 家族的 group 级断言（aria-disabled 在 group 根上）。
    it('should have the `aria-disabled` attribute', async () => {
      await render(RadioGroup, { disabled: true });
      expect(document.querySelector('[role="radiogroup"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should not have the aria attribute when `disabled` is not set', async () => {
      await render(RadioGroup, {});
      expect(document.querySelector('[role="radiogroup"]')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('prop: readOnly', () => {
    // React 原版完整用例（含 Radio.Root 子件断言）见下方 TODO refactor component 块。
    it('should have the `aria-readonly` attribute', async () => {
      await render(RadioGroup, { readOnly: true });
      expect(document.querySelector('[role="radiogroup"]')).toHaveAttribute(
        'aria-readonly',
        'true',
      );
    });

    it('should not have the aria attribute when `readOnly` is not set', async () => {
      await render(RadioGroup, {});
      expect(document.querySelector('[role="radiogroup"]')).not.toHaveAttribute('aria-readonly');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // TODO refactor component: Radio 家族重构后，搜索 `TODO refactor component`
  // 取消本块注释（以下为 React 原版 RadioGroup.test.tsx 完整用例的 actview
  // 转写，全部渲染 <Radio.Root> 子件）。取消注释时启用导入：
  //   import { ref } from 'actview';
  //   import { Field } from '../field';
  //   import { Fieldset } from '../fieldset';
  //   import { Form } from '../form';
  //   import { Radio } from '../radio';
  //   import { DirectionProvider } from '../direction-provider';
  // ══════════════════════════════════════════════════════════════════════
  /*
  describe('prop: onValueChange', () => {
    it('should call onValueChange when an item is clicked', async () => {
      const handleChange = vi.fn();
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.calls[0][0]).toBe('a');
    });

    it('should report keyboard modifier event properties when calling onCheckedChange', async () => {
      const handleChange = vi.fn((value: string, eventDetails: any) => eventDetails);
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.keyDown(document.querySelector('[data-testid="item"]') as HTMLElement, {
          key: 'Shift',
          shiftKey: true,
        });
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.results[0]?.value.event.shiftKey).toBe(true);
    });

    it('should select an item with Space on keyup', async () => {
      const handleChange = vi.fn();
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      await act(() => {
        item.focus();
      });

      await act(() => {
        fireEvent.keyDown(item, { key: ' ' });
      });
      expect(handleChange).not.toHaveBeenCalled();

      await act(() => {
        fireEvent.keyUp(item, { key: ' ' });
      });
      expect(handleChange).toHaveBeenCalledOnce();
      expect(handleChange).toHaveBeenLastCalledWith('a', expect.anything());
    });

    it('should not select an item with Enter', async () => {
      const handleChange = vi.fn();
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      await act(() => {
        item.focus();
      });

      await act(() => {
        fireEvent.keyDown(item, { key: 'Enter' });
      });

      expect(handleChange).not.toHaveBeenCalled();
      expect(item).toHaveAttribute('aria-checked', 'false');
    });

    it('does not change state when canceled via a root click', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('does not change state when canceled via a hidden input click', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('input[type="radio"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('does not change state when canceled via arrow key navigation', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          );
        },
        {},
      );

      const itemA = document.querySelector('[data-testid="item-a"]') as HTMLElement;
      await act(() => {
        itemA.focus();
        fireEvent.keyDown(itemA, { key: 'ArrowRight' });
      });

      expect(document.querySelector('[data-testid="item-b"]')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });
  });

  describe('prop: disabled', () => {
    it('should have the `aria-disabled` attribute (radio 子件断言)', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup disabled>
              <Radio.Root value="a" />
            </RadioGroup>
          );
        },
        {},
      );
      expect(document.querySelector('[role="radiogroup"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(document.querySelector('[role="radio"]')).toHaveAttribute('aria-disabled', 'true');
      expect(document.querySelector('[role="radio"]')).toHaveAttribute('data-disabled');
      const input = document.querySelector('input[type="radio"]');
      expect(input).toHaveAttribute('disabled');
    });

    it('should not change its state when clicked', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup disabled>
              <Radio.Root value="" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      expect(item).toHaveAttribute('aria-checked', 'false');

      await act(() => {
        fireEvent.click(item);
      });

      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: readOnly', () => {
    it('should not change its state when clicked', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup readOnly>
              <Radio.Root value="" data-testid="item" />
            </RadioGroup>
          );
        },
        {},
      );

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      expect(item).toHaveAttribute('aria-checked', 'false');

      await act(() => {
        fireEvent.click(item);
      });

      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('should update its state if the underlying input is toggled', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup data-testid="root">
            <Radio.Root value="" data-testid="item" />
          </RadioGroup>
        );
      },
      {},
    );

    const item = document.querySelector('[data-testid="item"]') as HTMLElement;
    expect(item).toHaveAttribute('aria-checked', 'false');

    await act(() => {
      const input = document.querySelector('input[type="radio"]') as HTMLInputElement;
      input.checked = true;
      fireEvent.change(input);
    });

    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('should place the style hooks on the root and subcomponents', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup disabled data-testid="root">
            <Radio.Root value="a" data-testid="item" />
          </RadioGroup>
        );
      },
      {},
    );

    expect(document.querySelector('[data-testid="root"]')).toHaveAttribute('data-disabled');
    expect(document.querySelector('[data-testid="item"]')).toHaveAttribute('data-disabled');
  });

  it('should set the name attribute on each radio input', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup name="test" defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputs[0]).toHaveAttribute('name', 'test');
    expect(inputs[1]).toHaveAttribute('name', 'test');
  });

  it('points inputRef to the checked radio input when present', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    await render(
      function Demo() {
        return (
          <RadioGroup inputRef={inputRef} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('allows reading inputRef.current in an effect', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    await render(
      function Demo() {
        return (
          <RadioGroup inputRef={inputRef} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('supports inputRef as a function', async () => {
    const refs: Array<HTMLInputElement | null> = [];
    await render(
      function Demo() {
        return (
          <RadioGroup inputRef={(node) => refs.push(node)} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(refs[refs.length - 1]).toBe(inputs[0]);
  });

  it('does not detach a stable inputRef callback on unrelated re-renders', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo(props: any) {
      return (
        <RadioGroup inputRef={inputRef} {...props}>
          <Radio.Root value="a" />
        </RadioGroup>
      );
    }

    const result = await render(Demo, { defaultValue: 'a' });
    await result.setProps({ defaultValue: 'a' });

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('skips disabled radios when assigning inputRef', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    await render(
      function Demo() {
        return (
          <RadioGroup inputRef={inputRef}>
            <Radio.Root value="a" disabled />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[1]);
  });

  it('points inputRef to the first radio input when nativeButton wraps a button', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    await render(
      function Demo() {
        return (
          <RadioGroup inputRef={inputRef} nativeButton>
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      },
      {},
    );

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('keeps inputRef pointing to the first radio when the value is cleared', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo(props: any) {
      return (
        <RadioGroup inputRef={inputRef} {...props}>
          <Radio.Root value="a" />
          <Radio.Root value="b" />
        </RadioGroup>
      );
    }

    const result = await render(Demo, { defaultValue: 'b' });
    await result.setProps({ value: undefined, defaultValue: undefined });

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('detaches inputRef when its current radio unmounts', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo(props: any) {
      return (
        <RadioGroup inputRef={inputRef} {...props}>
          {props.showFirst ? <Radio.Root value="a" /> : null}
          <Radio.Root value="b" />
        </RadioGroup>
      );
    }

    const result = await render(Demo, { defaultValue: 'a', showFirst: true });
    await result.setProps({ showFirst: false });

    expect(inputRef.current).toBe(null);
  });

  it('detaches inputRef when a radio selected after mount unmounts', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo(props: any) {
      return (
        <RadioGroup inputRef={inputRef} {...props}>
          {props.showFirst ? <Radio.Root value="a" /> : null}
          <Radio.Root value="b" />
        </RadioGroup>
      );
    }

    const result = await render(Demo, { defaultValue: 'a', showFirst: true });
    await act(() => {
      fireEvent.click(document.querySelectorAll('input[type="radio"]')[1]);
    });
    await result.setProps({ showFirst: false });

    expect(inputRef.current).toBe(document.querySelectorAll('input[type="radio"]')[0]);
  });

  it('should automatically select radio upon navigation', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup defaultValue="a">
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        );
      },
      {},
    );

    const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
    await act(() => {
      radioA.focus();
      fireEvent.keyDown(radioA, { key: 'ArrowRight' });
    });

    expect(document.querySelector('[data-testid="radio-b"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  describe('should manage arrow key navigation', () => {
    (['ltr', 'rtl'] as const).forEach((direction) => {
      it(`moves focus ${direction === 'rtl' ? 'in the opposite' : 'in the same'} direction`, async () => {
        function Demo() {
          return (
            <DirectionProvider direction={direction}>
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" data-testid="radio-a" />
                <Radio.Root value="b" data-testid="radio-b" />
                <Radio.Root value="c" data-testid="radio-c" />
              </RadioGroup>
            </DirectionProvider>
          );
        }

        await render(Demo, {});

        const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
        await act(() => {
          radioA.focus();
          fireEvent.keyDown(radioA, { key: 'ArrowRight' });
        });

        const expected = direction === 'ltr' ? 'radio-b' : 'radio-c';
        expect(document.querySelector(`[data-testid="${expected}"]`)).toHaveAttribute(
          'tabindex',
          '0',
        );
      });
    });
  });

  describe('modifier keys', () => {
    it('when Shift is pressed arrow keys move focus normally', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup defaultValue="a">
              <Radio.Root value="a" data-testid="radio-a" />
              <Radio.Root value="b" data-testid="radio-b" />
            </RadioGroup>
          );
        },
        {},
      );

      const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
      await act(() => {
        radioA.focus();
        fireEvent.keyDown(radioA, { key: 'ArrowRight', shiftKey: true });
      });

      expect(document.querySelector('[data-testid="radio-b"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  });

  describe('item removal', () => {
    it('moves the tab stop to the checked radio when the highlighted radio is removed', async () => {
      function Demo(props: any) {
        return (
          <RadioGroup defaultValue="b" {...props}>
            {props.showA ? <Radio.Root value="a" data-testid="radio-a" /> : null}
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        );
      }

      const result = await render(Demo, { showA: true });
      await result.setProps({ showA: false });

      expect(document.querySelector('[data-testid="radio-b"]')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('style hooks', () => {
    it('should apply data-checked and data-unchecked to radio root and indicator', async () => {
      await render(
        function Demo() {
          return (
            <RadioGroup defaultValue="a">
              <Radio.Root value="a" data-testid="radio-a">
                <Radio.Indicator />
              </Radio.Root>
              <Radio.Root value="b" data-testid="radio-b">
                <Radio.Indicator />
              </Radio.Root>
            </RadioGroup>
          );
        },
        {},
      );

      expect(document.querySelector('[data-testid="radio-a"]')).toHaveAttribute(
        'data-checked',
        '',
      );
      expect(document.querySelector('[data-testid="radio-b"]')).toHaveAttribute(
        'data-unchecked',
        '',
      );
    });
  });

  it('does not forward `value` prop', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup value="test" data-testid="radio-group">
            <Radio.Root value="" />
          </RadioGroup>
        );
      },
      {},
    );

    expect(document.querySelector('[data-testid="radio-group"]')).not.toHaveAttribute('value');
  });

  it('sets tabIndex=0 to the correct element initially', async () => {
    await render(
      function Demo() {
        return (
          <RadioGroup defaultValue="b">
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        );
      },
      {},
    );

    const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
    const radioB = document.querySelector('[data-testid="radio-b"]') as HTMLElement;
    expect(radioA).not.toHaveAttribute('tabindex', '0');
    expect(radioB).toHaveAttribute('tabindex', '0');
  });

  describe('with native <label>', () => {
    it('associates implicitly', async () => {
      const changeSpy = vi.fn((newValue: string) => newValue);
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={changeSpy}>
              <label>
                <Radio.Root value="a" data-testid="item" />
                Label text
              </label>
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(changeSpy).toHaveBeenCalledWith('a', expect.anything());
    });

    it('associates explicitly', async () => {
      const changeSpy = vi.fn((newValue: string) => newValue);
      await render(
        function Demo() {
          return (
            <RadioGroup onValueChange={changeSpy}>
              <Radio.Root value="a" data-testid="item" />
              <label htmlFor="item">Label text</label>
            </RadioGroup>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(changeSpy).toHaveBeenCalledWith('a', expect.anything());
    });
  });

  describe('Field', () => {
    it('passes the `name` prop to the radio input', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" />
                <Radio.Root value="b" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      const inputs = document.querySelectorAll('input[type="radio"]');
      expect(inputs[0]).toHaveAttribute('name', 'test');
      expect(inputs[1]).toHaveAttribute('name', 'test');
    });
  });

  describe('Field.Root', () => {
    it('should receive disabled prop from Field.Root', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root disabled>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      expect(document.querySelector('[data-testid="group"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute('data-disabled');
    });

    it('should receive name prop from Field.Root', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      const inputs = document.querySelectorAll('input[type="radio"]');
      expect(inputs[0]).toHaveAttribute('name', 'test');
    });

    it('revalidates when the controlled value changes externally', async () => {
      function Demo(props: any) {
        return (
          <Field.Root name="test" validate={(value: string) => (value === 'a' ? 'Error' : null)}>
            <RadioGroup value={props.value} onValueChange={props.onValueChange}>
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
        );
      }

      const result = await render(Demo, {
        value: 'a',
        onValueChange: () => {},
      });
      await result.setProps({ value: 'b' });

      const input = document.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Field.Label', () => {
    it('associates implicitly', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <Field.Label data-testid="label">Label</Field.Label>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const label = document.querySelector('[data-testid="label"]') as HTMLElement;
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('associates explicitly', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <Field.Label htmlFor="group-id" data-testid="label">
                Label
              </Field.Label>
              <RadioGroup id="group-id" data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const label = document.querySelector('[data-testid="label"]') as HTMLElement;
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });
  });

  describe('Field.Description', () => {
    it('links the group and individual radios', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
              <Field.Description data-testid="description">Description</Field.Description>
            </Field.Root>
          );
        },
        {},
      );

      const description = document.querySelector('[data-testid="description"]') as HTMLElement;
      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      expect(group.getAttribute('aria-describedby')).toContain(description.id);
      expect(item.getAttribute('aria-describedby')).toContain(description.id);
    });
  });

  describe('prop: validationMode', () => {
    it('onSubmit', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test" validationMode="onSubmit" validate={() => 'Error'}>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      expect(document.querySelector('[data-testid="group"]')).not.toHaveAttribute(
        'aria-invalid',
      );
    });

    it('onBlur validates only when focus leaves the group', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test" validationMode="onBlur" validate={() => 'Error'}>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
        },
        {},
      );

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      await act(() => {
        group.focus();
        fireEvent.blur(group);
      });

      expect(document.querySelector('input[type="radio"]')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });
  });

  describe('Fieldset', () => {
    it('keeps inputRef available after an ancestor fieldset is enabled', async () => {
      const inputRef = { current: null as HTMLInputElement | null };
      function Demo(props: any) {
        return (
          <Fieldset.Root disabled={props.disabled}>
            <Field.Root name="test">
              <RadioGroup inputRef={inputRef}>
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          </Fieldset.Root>
        );
      }

      const result = await render(Demo, { disabled: true });
      await result.setProps({ disabled: false });

      const inputs = document.querySelectorAll('input[type="radio"]');
      expect(inputRef.current).toBe(inputs[0]);
    });

    it('labels the radio group from the fieldset legend', async () => {
      await render(
        function Demo() {
          return (
            <Field.Root name="test">
              <Fieldset.Root render={<RadioGroup />}>
                <Fieldset.Legend>Legend</Fieldset.Legend>
                <Field.Item>
                  <Radio.Root value="a" />
                </Field.Item>
              </Fieldset.Root>
            </Field.Root>
          );
        },
        {},
      );

      const legend = document.querySelector('fieldset')!.querySelector('div') as HTMLElement;
      const radioGroup = document.querySelector('[role="radiogroup"]') as HTMLElement;
      expect(radioGroup.getAttribute('aria-labelledby')).toBe(legend.id);
    });

    it('updates label precedence without retaining replaced or unmounted IDs', async () => {
      function Demo() {
        const [explicit, setExplicit] = ref(true);
        const [fieldLabel, setFieldLabel] = ref<'field-label-a' | 'field-label-b'>(
          'field-label-a',
        );
        const [showFieldLabel, setShowFieldLabel] = ref(true);
        const [legend, setLegend] = ref<'legend-a' | 'legend-b'>('legend-a');
        const [showLegend, setShowLegend] = ref(true);

        return (
          <>
            <span id="explicit-label">Explicit label</span>
            <Field.Root name="choice">
              {showFieldLabel.value && (
                <Field.Label
                  key={fieldLabel.value}
                  id={fieldLabel.value}
                  render={<span />}
                  nativeLabel={false}
                >
                  Field label
                </Field.Label>
              )}
              <Fieldset.Root>
                {showLegend.value && (
                  <Fieldset.Legend key={legend.value} id={legend.value}>
                    Legend
                  </Fieldset.Legend>
                )}
                <RadioGroup
                  aria-labelledby={explicit.value ? 'explicit-label' : undefined}
                  data-testid="group"
                >
                  <Radio.Root value="a" />
                </RadioGroup>
              </Fieldset.Root>
              <button
                type="button"
                data-testid="toggle-explicit"
                onClick={() => {
                  setExplicit(!explicit.value);
                }}
              >
                Toggle explicit
              </button>
              <button
                type="button"
                data-testid="change-field-label"
                onClick={() => {
                  setFieldLabel(
                    fieldLabel.value === 'field-label-a' ? 'field-label-b' : 'field-label-a',
                  );
                }}
              >
                Change field label
              </button>
              <button
                type="button"
                data-testid="toggle-field-label"
                onClick={() => {
                  setShowFieldLabel(!showFieldLabel.value);
                }}
              >
                Toggle field label
              </button>
              <button
                type="button"
                data-testid="change-legend"
                onClick={() => {
                  setLegend(legend.value === 'legend-a' ? 'legend-b' : 'legend-a');
                }}
              >
                Change legend
              </button>
              <button
                type="button"
                data-testid="toggle-legend"
                onClick={() => {
                  setShowLegend(!showLegend.value);
                }}
              >
                Toggle legend
              </button>
            </Field.Root>
          </>
        );
      }

      await render(Demo, {});

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      expect(group.getAttribute('aria-labelledby')).toBe('explicit-label');

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="toggle-explicit"]') as HTMLElement);
      });
      expect(group.getAttribute('aria-labelledby')).toBe('field-label-a');

      await act(() => {
        fireEvent.click(
          document.querySelector('[data-testid="change-field-label"]') as HTMLElement,
        );
      });
      expect(group.getAttribute('aria-labelledby')).toBe('field-label-b');

      await act(() => {
        fireEvent.click(
          document.querySelector('[data-testid="toggle-field-label"]') as HTMLElement,
        );
      });
      expect(group.getAttribute('aria-labelledby')).toBe('legend-a');

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="toggle-legend"]') as HTMLElement);
      });
      expect(group.getAttribute('aria-labelledby')).toBe(null);

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="change-legend"]') as HTMLElement);
        fireEvent.click(document.querySelector('[data-testid="toggle-legend"]') as HTMLElement);
      });
      expect(group.getAttribute('aria-labelledby')).toBe('legend-b');
    });
  });

  describe('Form', () => {
    it('submits null to onFormSubmit when no radio is selected', async () => {
      const handleSubmit = vi.fn();
      await render(
        function Demo() {
          return (
            <Form onFormSubmit={handleSubmit}>
              <Field.Root name="choice">
                <RadioGroup>
                  <Radio.Root value="a" />
                  <Radio.Root value="b" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ choice: null }),
        expect.anything(),
      );
    });

    it('unblocks submission after every radio in the group unmounts', async () => {
      const handleSubmit = vi.fn();
      function Demo(props: any) {
        return (
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="choice">
              {props.show ? (
                <RadioGroup>
                  <Radio.Root value="a" />
                </RadioGroup>
              ) : null}
            </Field.Root>
          </Form>
        );
      }

      const result = await render(Demo, { show: true });
      await result.setProps({ show: false });

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('runs the custom validator after every radio in the group unmounts', async () => {
      const validate = vi.fn(() => null);
      function Demo(props: any) {
        return (
          <Form>
            <Field.Root name="choice" validate={validate}>
              {props.show ? (
                <RadioGroup>
                  <Radio.Root value="a" />
                </RadioGroup>
              ) : null}
            </Field.Root>
          </Form>
        );
      }

      const result = await render(Demo, { show: true });
      await result.setProps({ show: false });

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(validate).toHaveBeenCalled();
    });

    it('excludes a disabled selected radio from onFormSubmit to match native form data', async () => {
      const handleSubmit = vi.fn();
      await render(
        function Demo() {
          return (
            <Form onFormSubmit={handleSubmit}>
              <Field.Root name="choice">
                <RadioGroup defaultValue="a">
                  <Radio.Root value="a" disabled />
                  <Radio.Root value="b" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ choice: null }),
        expect.anything(),
      );
    });

    it('includes a selected radio again when it is re-enabled before form submission', async () => {
      const handleSubmit = vi.fn();
      function Demo(props: any) {
        return (
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="choice">
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" disabled={props.disabled} />
                <Radio.Root value="b" />
              </RadioGroup>
            </Field.Root>
          </Form>
        );
      }

      const result = await render(Demo, { disabled: true });
      await result.setProps({ disabled: false });

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ choice: 'a' }),
        expect.anything(),
      );
    });

    it('excludes an initially disabled selected radio from onFormSubmit to match native form data', async () => {
      const handleSubmit = vi.fn();
      await render(
        function Demo() {
          return (
            <Form onFormSubmit={handleSubmit}>
              <Field.Root name="choice">
                <RadioGroup defaultValue="a">
                  <Radio.Root value="a" disabled />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ choice: null }),
        expect.anything(),
      );
    });

    it('includes a group fully portaled outside the form element in onFormSubmit', async () => {
      const handleSubmit = vi.fn();
      await render(
        function Demo() {
          return (
            <>
              <Form onFormSubmit={handleSubmit}>
                <Field.Root name="choice" />
              </Form>
              <RadioGroup form="test-form">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
            </>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('clears required validation when a value is selected', async () => {
      await render(
        function Demo() {
          return (
            <Form>
              <Field.Root name="choice" required>
                <RadioGroup data-testid="group">
                  <Radio.Root value="a" data-testid="item" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('input[type="radio"]')).not.toHaveAttribute('aria-invalid');
    });

    it('validates when inputRef is a function', async () => {
      await render(
        function Demo() {
          return (
            <Form>
              <Field.Root name="choice" validate={() => 'Error'}>
                <RadioGroup inputRef={() => {}}>
                  <Radio.Root value="a" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(document.querySelector('input[type="radio"]')).toHaveAttribute('aria-invalid', 'true');
    });

    it('focuses the first enabled radio when all radios start disabled', async () => {
      function Demo(props: any) {
        return (
          <RadioGroup {...props}>
            <Radio.Root value="a" data-testid="item-a" />
            <Radio.Root value="b" data-testid="item-b" />
          </RadioGroup>
        );
      }

      const result = await render(Demo, { disabled: true });
      await result.setProps({ disabled: false });

      expect(document.querySelector('[data-testid="item-a"]')).toHaveAttribute('tabindex', '0');
    });

    it('clears external errors on change', async () => {
      const handleSubmit = vi.fn();
      await render(
        function Demo() {
          return (
            <Form onFormSubmit={handleSubmit} errors={{ choice: 'External error' }}>
              <Field.Root name="choice">
                <RadioGroup data-testid="group">
                  <Radio.Root value="a" data-testid="item" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      expect(document.querySelector('[data-testid="group"]')).toHaveAttribute('aria-invalid', 'true');

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="group"]')).not.toHaveAttribute('aria-invalid');
    });

    it('appends the id attribute of the error to aria-describedby of individual radios', async () => {
      await render(
        function Demo() {
          return (
            <Form errors={{ choice: 'Error' }}>
              <Field.Root name="choice">
                <RadioGroup>
                  <Radio.Root value="a" data-testid="item" />
                </RadioGroup>
              </Field.Root>
            </Form>
          );
        },
        {},
      );

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      const error = document.querySelector('[role="alert"]') as HTMLElement;
      expect(item.getAttribute('aria-describedby')).toContain(error.id);
    });
  });
  */
});
