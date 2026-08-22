import { describe, expect, it, vi } from 'vitest';
import { ref } from 'actview';
import { RadioGroup } from '@/radio-group/RadioGroup';
import { Field } from '@/field';
import { Fieldset } from '@/fieldset';
import { Form } from '@/form';
import { Radio } from '@/radio';
import { DirectionProvider } from '@/direction-provider';
import { createRenderer } from '#/test/createRenderer';

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
  // TODO refactor component: 本块曾因 Radio 家族未重构而注释（Radio.Root 不可用）。
  // Radio 家族已重构（RadioRoot/RadioIndicator），本块已解锁；如需再次禁用，
  // 保留 `// TODO refactor component` 标记供全局搜索。
  // ══════════════════════════════════════════════════════════════════════
  describe('prop: onValueChange', () => {
    it('should call onValueChange when an item is clicked', async () => {
      const handleChange = vi.fn();
      function Demo() {
        return (
          <RadioGroup onValueChange={handleChange}>
            <Radio.Root value="a" data-testid="item" />
          </RadioGroup>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.calls[0][0]).toBe('a');
    });

    it('should report keyboard modifier event properties when calling onCheckedChange', async () => {
      const handleChange = vi.fn((value: string, eventDetails: any) => eventDetails);
      function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.keyDown(document.querySelector('[data-testid="item"]') as HTMLElement, {
          key: 'Shift',
          shiftKey: true,
        });
        // React 原版用 user-event `{Shift>}` 按住 + click：click 事件 shiftKey=true。
        // fireEvent 不维护按键状态，等价转写为 click 显式带 shiftKey。
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement, {
          shiftKey: true,
        });
      });

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.results[0]?.value.event.shiftKey).toBe(true);
    });

    it('should select an item with Space on keyup', async () => {
      const handleChange = vi.fn();
      function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

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
      function Demo() {
          return (
            <RadioGroup onValueChange={handleChange}>
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

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
      function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('does not change state when canceled via a hidden input click', async () => {
      function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('input[type="radio"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('does not change state when canceled via arrow key navigation', async () => {
      function Demo() {
          return (
            <RadioGroup
              onValueChange={(_value, eventDetails) => eventDetails.cancel()}
            >
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

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
      function Demo() {
          return (
            <RadioGroup disabled>
              <Radio.Root value="a" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;
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
      function Demo() {
          return (
            <RadioGroup disabled>
              <Radio.Root value="" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

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
      function Demo() {
          return (
            <RadioGroup readOnly>
              <Radio.Root value="" data-testid="item" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      expect(item).toHaveAttribute('aria-checked', 'false');

      await act(() => {
        fireEvent.click(item);
      });

      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('should update its state if the underlying input is toggled', async () => {
    function Demo() {
        return (
          <RadioGroup data-testid="root">
            <Radio.Root value="" data-testid="item" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const item = document.querySelector('[data-testid="item"]') as HTMLElement;
    expect(item).toHaveAttribute('aria-checked', 'false');

    await act(() => {
      // React 原版 fireEvent.click(input)：click 激活 → input/change 事件
      const input = document.querySelector('input[type="radio"]') as HTMLInputElement;
      fireEvent.click(input);
    });

    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('should place the style hooks on the root and subcomponents', async () => {
    function Demo() {
        return (
          <RadioGroup disabled data-testid="root">
            <Radio.Root value="a" data-testid="item" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    expect(document.querySelector('[data-testid="root"]')).toHaveAttribute('data-disabled');
    expect(document.querySelector('[data-testid="item"]')).toHaveAttribute('data-disabled');
  });

  it('should set the name attribute on each radio input', async () => {
    function Demo() {
        return (
          <RadioGroup name="test" defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputs[0]).toHaveAttribute('name', 'test');
    expect(inputs[1]).toHaveAttribute('name', 'test');
  });

  it('points inputRef to the checked radio input when present', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo() {
        return (
          <RadioGroup inputRef={inputRef} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('allows reading inputRef.current in an effect', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo() {
        return (
          <RadioGroup inputRef={inputRef} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('supports inputRef as a function', async () => {
    const refs: Array<HTMLInputElement | null> = [];
    function Demo() {
        return (
          <RadioGroup inputRef={(node) => refs.push(node)} defaultValue="a">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

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
    function Demo() {
        return (
          <RadioGroup inputRef={inputRef}>
            <Radio.Root value="a" disabled />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[1]);
  });

  it('points inputRef to the first radio input when nativeButton wraps a button', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function Demo() {
        return (
          <RadioGroup inputRef={inputRef} nativeButton>
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const inputs = document.querySelectorAll('input[type="radio"]');
    expect(inputRef.current).toBe(inputs[0]);
  });

  it('keeps inputRef pointing to the first radio when the value is cleared', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function App() {
      const value = ref<null | string>('a');

      return (
        <>
          <RadioGroup value={value.value} inputRef={inputRef}>
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
          <button
            type="button"
            data-testid="clear"
            onClick={() => {
              value.value = null;
            }}
          >
            Clear
          </button>
        </>
      );
    }

    await render(App, {});

    const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
    const inputA = radioA.nextElementSibling as HTMLInputElement;

    expect(inputRef.current).toBe(inputA);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="clear"]') as HTMLElement);
    });

    expect(inputRef.current).toBe(inputA);
  });

  it('detaches inputRef when its current radio unmounts', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function App() {
      const showFirst = ref(true);
      return (
        <>
          <RadioGroup inputRef={inputRef}>
            {showFirst.value ? <Radio.Root value="a" data-testid="radio-a" /> : null}
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
          <button
            type="button"
            data-testid="remove-first"
            onClick={() => {
              showFirst.value = false;
            }}
          >
            Remove first
          </button>
        </>
      );
    }

    await render(App, {});

    const inputA = document
      .querySelector('[data-testid="radio-a"]')!
      .nextElementSibling as HTMLInputElement;

    expect(inputRef.current).toBe(inputA);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="remove-first"]') as HTMLElement);
    });

    expect(inputRef.current).toBe(null);
  });

  it('detaches inputRef when a radio selected after mount unmounts', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    function App() {
      const showSecond = ref(true);
      return (
        <>
          <RadioGroup inputRef={inputRef}>
            <Radio.Root value="a" data-testid="radio-a" />
            {showSecond.value ? <Radio.Root value="b" data-testid="radio-b" /> : null}
          </RadioGroup>
          <button
            type="button"
            data-testid="remove-second"
            onClick={() => {
              showSecond.value = false;
            }}
          >
            Remove second
          </button>
        </>
      );
    }

    await render(App, {});

    const inputA = document
      .querySelector('[data-testid="radio-a"]')!
      .nextElementSibling as HTMLInputElement;
    const inputB = document
      .querySelector('[data-testid="radio-b"]')!
      .nextElementSibling as HTMLInputElement;

    expect(inputRef.current).toBe(inputA);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="radio-b"]') as HTMLElement);
    });
    expect(inputRef.current).toBe(inputB);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="remove-second"]') as HTMLElement);
    });
    expect(inputRef.current).toBe(null);
  });

  it('should automatically select radio upon navigation', async () => {
    function Demo() {
        return (
          <RadioGroup defaultValue="a">
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

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
      function Demo() {
          return (
            <RadioGroup defaultValue="a">
              <Radio.Root value="a" data-testid="radio-a" />
              <Radio.Root value="b" data-testid="radio-b" />
            </RadioGroup>
          );
      }

      await render(Demo, {});;

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
      }

      await render(Demo, {});;

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
    function Demo() {
        return (
          <RadioGroup value="test" data-testid="radio-group">
            <Radio.Root value="" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    expect(document.querySelector('[data-testid="radio-group"]')).not.toHaveAttribute('value');
  });

  it('sets tabIndex=0 to the correct element initially', async () => {
    function Demo() {
        return (
          <RadioGroup defaultValue="b">
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        );
      }

      await render(Demo, {});;

    const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
    const radioB = document.querySelector('[data-testid="radio-b"]') as HTMLElement;
    expect(radioA).not.toHaveAttribute('tabindex', '0');
    expect(radioB).toHaveAttribute('tabindex', '0');
  });

  describe('with native <label>', () => {
    it('associates implicitly', async () => {
      const changeSpy = vi.fn((newValue: string) => newValue);
      function Demo() {
          return (
            <RadioGroup onValueChange={changeSpy}>
              <label>
                <Radio.Root value="a" data-testid="item" />
                Label text
              </label>
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(changeSpy).toHaveBeenCalledWith('a', expect.anything());
    });

    it('associates explicitly', async () => {
      const changeSpy = vi.fn((newValue: string) => newValue);
      function Demo() {
          return (
            <RadioGroup onValueChange={changeSpy}>
              <Radio.Root value="a" data-testid="item" />
              {/* AD-24：actview 不映射 htmlFor→for，JSX 写原生属性名 for */}
              <label for="item">Label text</label>
            </RadioGroup>
          );
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(changeSpy).toHaveBeenCalledWith('a', expect.anything());
    });
  });

  describe('Field', () => {
    it('passes the `name` prop to the radio input', async () => {
      function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" />
                <Radio.Root value="b" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      const inputs = document.querySelectorAll('input[type="radio"]');
      expect(inputs[0]).toHaveAttribute('name', 'test');
      expect(inputs[1]).toHaveAttribute('name', 'test');
    });
  });

  describe('Field.Root', () => {
    it('should receive disabled prop from Field.Root', async () => {
      function Demo() {
          return (
            <Field.Root disabled>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      expect(document.querySelector('[data-testid="group"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(document.querySelector('[data-testid="item"]')).toHaveAttribute('data-disabled');
    });

    it('should receive name prop from Field.Root', async () => {
      function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      const inputs = document.querySelectorAll('input[type="radio"]');
      expect(inputs[0]).toHaveAttribute('name', 'test');
    });

    it('revalidates when the controlled value changes externally', async () => {
      function Demo(props: any) {
        // React 原版：validationMode="onChange" + value==='b' 时报错（初始 'a' 有效）
        return (
          <Field.Root
            name="test"
            validationMode="onChange"
            validate={(value: string) => (value === 'b' ? 'Error' : null)}
          >
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

      // aria-invalid 上在 group 根（getValidationProps 应用在根，React 原版 getByRole('radiogroup')）
      const radioGroup = document.querySelector('[role="radiogroup"]') as HTMLElement;
      expect(radioGroup).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Field.Label', () => {
    it('associates implicitly', async () => {
      function Demo() {
          return (
            <Field.Root name="test">
              <Field.Label data-testid="label">Label</Field.Label>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const label = document.querySelector('[data-testid="label"]') as HTMLElement;
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('associates explicitly', async () => {
      function Demo() {
          return (
            <Field.Root name="test">
              {/* AD-24：actview 不映射 htmlFor→for，JSX 写原生属性名 for */}
              <Field.Label for="group-id" data-testid="label">
                Label
              </Field.Label>
              <RadioGroup id="group-id" data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const label = document.querySelector('[data-testid="label"]') as HTMLElement;
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });
  });

  describe('Field.Description', () => {
    it('links the group and individual radios', async () => {
      function Demo() {
          return (
            <Field.Root name="test">
              <RadioGroup data-testid="group">
                <Radio.Root value="a" data-testid="item" />
              </RadioGroup>
              <Field.Description data-testid="description">Description</Field.Description>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      const description = document.querySelector('[data-testid="description"]') as HTMLElement;
      const group = document.querySelector('[data-testid="group"]') as HTMLElement;
      const item = document.querySelector('[data-testid="item"]') as HTMLElement;
      expect(group.getAttribute('aria-describedby')).toContain(description.id);
      expect(item.getAttribute('aria-describedby')).toContain(description.id);
    });
  });

  describe('prop: validationMode', () => {
    it('onSubmit', async () => {
      function Demo() {
          return (
            <Field.Root name="test" validationMode="onSubmit" validate={() => 'Error'}>
              <RadioGroup data-testid="group">
                <Radio.Root value="a" />
              </RadioGroup>
            </Field.Root>
          );
      }

      await render(Demo, {});;

      expect(document.querySelector('[data-testid="group"]')).not.toHaveAttribute(
        'aria-invalid',
      );
    });

    it('onBlur validates only when focus leaves the group', async () => {
      const validate = vi.fn((value: string) => (value === 'a' ? 'Error' : null));

      function Demo() {
        return (
          <>
            <Field.Root name="test" validationMode="onBlur" validate={validate}>
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" data-testid="radio-a" />
                <Radio.Root value="b" data-testid="radio-b" />
              </RadioGroup>
            </Field.Root>
            <button type="button">Outside</button>
          </>
        );
      }

      await render(Demo, {});

      const group = document.querySelector('[role="radiogroup"]') as HTMLElement;
      const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;
      const radioB = document.querySelector('[data-testid="radio-b"]') as HTMLElement;

      // blur 到组内 radio：不验证
      await act(() => {
        fireEvent.focus(radioA);
        fireEvent.blur(group, { relatedTarget: radioB });
      });
      expect(validate).not.toHaveBeenCalled();

      // blur 到组外：验证
      await act(() => {
        fireEvent.blur(group, { relatedTarget: document.querySelector('button') as HTMLElement });
      });
      expect(validate).toHaveBeenCalledTimes(1);
      expect(validate.mock.calls[0][0]).toBe('a');
      expect(group).toHaveAttribute('aria-invalid', 'true');
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
      }

      const result = await render(Demo, {});

      // React 原版用 screen.getByText('Legend')；actview 的 getByText 是前序 DFS
      // 返回最外层，getAllByText 取最后一个 = 文本直接父（legend 元素）
      const legends = result.getAllByText('Legend');
      const legend = legends[legends.length - 1];
      const radioGroup = document.querySelector('[role="radiogroup"]') as HTMLElement;
      expect(radioGroup.getAttribute('aria-labelledby')).toBe(legend.getAttribute('id'));
    });

    it('updates label precedence without retaining replaced or unmounted IDs', async () => {
      function Demo() {
        // React 原版 useState 数组解构；actview ref() 返回 Ref 对象不可解构（转写修正）
        const explicit = ref(true);
        const fieldLabel = ref<'field-label-a' | 'field-label-b'>('field-label-a');
        const showFieldLabel = ref(true);
        const legend = ref<'legend-a' | 'legend-b'>('legend-a');
        const showLegend = ref(true);

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
                  {...(explicit.value ? { 'aria-labelledby': 'explicit-label' } : {})}
                  data-testid="group"
                >
                  <Radio.Root value="a" />
                </RadioGroup>
              </Fieldset.Root>
              <button
                type="button"
                data-testid="toggle-explicit"
                onClick={() => {
                  explicit.value = !explicit.value;
                }}
              >
                Toggle explicit
              </button>
              <button
                type="button"
                data-testid="change-field-label"
                onClick={() => {
                  fieldLabel.value =
                    fieldLabel.value === 'field-label-a' ? 'field-label-b' : 'field-label-a';
                }}
              >
                Change field label
              </button>
              <button
                type="button"
                data-testid="toggle-field-label"
                onClick={() => {
                  showFieldLabel.value = !showFieldLabel.value;
                }}
              >
                Toggle field label
              </button>
              <button
                type="button"
                data-testid="change-legend"
                onClick={() => {
                  legend.value = legend.value === 'legend-a' ? 'legend-b' : 'legend-a';
                }}
              >
                Change legend
              </button>
              <button
                type="button"
                data-testid="toggle-legend"
                onClick={() => {
                  showLegend.value = !showLegend.value;
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
      const freshGroup = document.querySelector('[data-testid="group"]') as HTMLElement;
      console.log('[PROBE] same element:', freshGroup === group, 'fresh aria-labelledby=', freshGroup.getAttribute('aria-labelledby'));
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
      }

      await render(Demo, {});;

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
      const handleSubmit = vi.fn();
      const validate = vi.fn(() => 'always invalid');

      function Demo(props: any) {
        return (
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="choice" validate={validate}>
              {/* React 原版：RadioGroup 保留，仅 Radio.Root 卸载（mounted && <Radio.Root/>） */}
              <RadioGroup>{props.show ? <Radio.Root value="a" /> : null}</RadioGroup>
              <Field.Error data-testid="error" />
            </Field.Root>
          </Form>
        );
      }

      const result = await render(Demo, { show: true });
      await result.setProps({ show: false });

      await act(() => {
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).not.toHaveBeenCalled();
      expect(document.querySelector('[data-testid="error"]')).toHaveTextContent('always invalid');
    });

    it('excludes a disabled selected radio from onFormSubmit to match native form data', async () => {
      const handleSubmit = vi.fn();
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
      }

      await render(Demo, {});;

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
      }

      await render(Demo, {});;

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
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
        fireEvent.submit(document.querySelector('form') as HTMLElement);
      });

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('clears required validation when a value is selected', async () => {
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
      }

      await render(Demo, {});;

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('input[type="radio"]')).not.toHaveAttribute('aria-invalid');
    });

    it('validates when inputRef is a function', async () => {
      const inputRefSpy = vi.fn(() => () => {});
      function Demo() {
        return (
          <Form>
            <Field.Root name="test">
              <RadioGroup name="group" required inputRef={inputRefSpy}>
                <Radio.Root value="a" data-testid="item-a" />
                <Radio.Root value="b" data-testid="item-b" />
              </RadioGroup>
              <Field.Error match="valueMissing" data-testid="error">
                required
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      await render(Demo, {});

      expect(document.querySelector('[data-testid="error"]')).toBe(null);

      await act(() => {
        fireEvent.click(document.querySelector('button[type="submit"]') as HTMLElement);
      });

      expect(inputRefSpy.mock.calls.length).toBeGreaterThan(0);
      expect(document.querySelector('[data-testid="error"]')).toHaveTextContent('required');
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
      }

      await render(Demo, {});;

      expect(document.querySelector('[data-testid="group"]')).toHaveAttribute('aria-invalid', 'true');

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="item"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="group"]')).not.toHaveAttribute('aria-invalid');
    });

    it('appends the id attribute of the error to aria-describedby of individual radios', async () => {
      function Demo() {
        return (
          <Form>
            <Field.Root name="test">
              <RadioGroup name="group" required>
                <Field.Item>
                  <Radio.Root value="a" />
                  <Field.Description>description</Field.Description>
                </Field.Item>
              </RadioGroup>
              <Field.Error match="valueMissing" data-testid="error" />
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      await render(Demo, {});

      expect(document.querySelector('[data-testid="error"]')).toBe(null);

      await act(() => {
        fireEvent.click(document.querySelector('button[type="submit"]') as HTMLElement);
      });

      const error = document.querySelector('[data-testid="error"]') as HTMLElement;
      const radio = document.querySelector('[role="radio"]') as HTMLElement;
      // React 原版 getByText('description')——actview 的 getByText 前序 DFS 返回最外层
      // （Field.Item 的 div 也含该文本），故精确查 <p>（Field.Description 默认标签）
      const descriptions = document.querySelectorAll('p');
      const description = Array.from(descriptions).find(
        (el) => el.textContent === 'description',
      ) as HTMLElement;

      expect(radio.getAttribute('aria-describedby')).toContain(error.getAttribute('id'));
      expect(radio.getAttribute('aria-describedby')).toContain(description.getAttribute('id'));
    });
  });
});
