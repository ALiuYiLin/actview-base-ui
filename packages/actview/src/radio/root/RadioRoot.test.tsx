import { describe, expect, it, vi } from 'vitest';
import { ref } from 'actview';
import { RadioGroup } from '@/radio-group/RadioGroup';
import { RadioRoot } from '@/radio/root/RadioRoot';
import { createRenderer } from '#/test/createRenderer';

const { render, fireEvent, act } = createRenderer();

describe('<Radio.Root />', () => {
  // React 原版 conformance（refInstanceof HTMLSpanElement）——actview 无此基建，不移植

  it('does not forward `value` prop', async () => {
    function Demo() {
      return (
        <RadioGroup>
          <RadioRoot value="test" data-testid="radio-root" />
        </RadioGroup>
      );
    }

    await render(Demo, {});

    expect(document.querySelector('[data-testid="radio-root"]')).not.toHaveAttribute('value');
  });

  it('allows `null` value', async () => {
    function Demo() {
      return (
        <RadioGroup>
          <RadioRoot value={null} data-testid="radio-null" />
          <RadioRoot value="a" data-testid="radio-a" />
        </RadioGroup>
      );
    }

    await render(Demo, {});

    const radioNull = document.querySelector('[data-testid="radio-null"]') as HTMLElement;
    const radioA = document.querySelector('[data-testid="radio-a"]') as HTMLElement;

    await act(() => {
      fireEvent.click(radioNull);
    });
    expect(radioNull).toHaveAttribute('aria-checked', 'true');

    await act(() => {
      fireEvent.click(radioA);
    });
    expect(radioNull).toHaveAttribute('aria-checked', 'false');
  });

  it('associates `id` with the native button when `nativeButton=true`', async () => {
    function Demo() {
      return (
        <div>
          {/* AD-24：actview 不映射 htmlFor→for，JSX 写原生属性名 for（React 原版写 htmlFor） */}
          <label data-testid="label" for="myRadio">
            A
          </label>

          <RadioGroup defaultValue="b">
            <RadioRoot value="a" id="myRadio" nativeButton render={<button />} data-testid="a" />
            <RadioRoot value="b" data-testid="b" />
          </RadioGroup>
        </div>
      );
    }

    await render(Demo, {});

    const radioA = document.querySelector('[data-testid="a"]') as HTMLElement;
    expect(radioA).toHaveAttribute('id', 'myRadio');

    const hiddenInput = radioA.nextElementSibling as HTMLInputElement | null;
    expect(hiddenInput?.tagName).toBe('INPUT');
    expect(hiddenInput).not.toHaveAttribute('id', 'myRadio');

    expect(radioA).toHaveAttribute('aria-checked', 'false');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="label"]') as HTMLElement);
    });
    expect(radioA).toHaveAttribute('aria-checked', 'true');
  });

  it('sets `aria-labelledby` from a sibling label associated with the hidden input', async () => {
    function Demo() {
      return (
        <div>
          {/* AD-24：actview 不映射 htmlFor→for，JSX 写原生属性名 for */}
          <label for="radio-input">Label</label>
          <RadioGroup>
            <RadioRoot value="a" id="radio-input" />
          </RadioGroup>
        </div>
      );
    }

    await render(Demo, {});

    // label 关联（useAriaLabelledBy 生成 label id）是挂载后同步逻辑，需要 flush
    await act(() => {});

    const label = document.querySelector('label') as HTMLElement;
    expect(label.id).not.toBe('');
    expect(document.querySelector('[role="radio"]')).toHaveAttribute('aria-labelledby', label.id);
  });

  it('updates fallback `aria-labelledby` when the hidden input id changes', async () => {
    function TestCase() {
      const id = ref('radio-input-a');

      return (
        <>
          {/* AD-24：actview 不映射 htmlFor→for，JSX 写原生属性名 for */}
          <label for="radio-input-a">Label A</label>
          <label for="radio-input-b">Label B</label>
          <RadioGroup>
            <RadioRoot value="a" id={id.value} />
          </RadioGroup>
          <button
            type="button"
            data-testid="toggle"
            onClick={() => {
              id.value = 'radio-input-b';
            }}
          >
            Toggle
          </button>
        </>
      );
    }

    await render(TestCase, {});

    // 初始 label 关联（useIsoLayoutEffect 挂载后同步），需要 flush
    await act(() => {});

    const radio = document.querySelector('[role="radio"]') as HTMLElement;
    const labelA = document.querySelectorAll('label')[0] as HTMLElement;

    expect(labelA.id).not.toBe('');
    expect(radio).toHaveAttribute('aria-labelledby', labelA.id);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="toggle"]') as HTMLElement);
    });
    // id 变化 → 关联重新解析（nextTick 延迟到子树 flush 完），需要额外 flush
    await act(() => {});

    const labelB = document.querySelectorAll('label')[1] as HTMLElement;
    expect(labelB.id).not.toBe('');
    expect(labelA.id).not.toBe(labelB.id);
    expect(radio).toHaveAttribute('aria-labelledby', labelB.id);
  });

  describe('prop: onClick', () => {
    it('propagates a single click event to ancestors per user click', async () => {
      const handleParentClick = vi.fn();
      function Demo() {
        return (
          <RadioGroup>
            <div onClick={handleParentClick}>
              <RadioRoot value="a" data-testid="radio" />
            </div>
          </RadioGroup>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="radio"]') as HTMLElement);
      });

      expect(handleParentClick).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-testid="radio"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('does not propagate to ancestors when stopPropagation() is called', async () => {
      const handleParentClick = vi.fn();
      function Demo() {
        return (
          <RadioGroup>
            <div onClick={handleParentClick}>
              <RadioRoot
                value="a"
                data-testid="radio"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </RadioGroup>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="radio"]') as HTMLElement);
      });

      expect(handleParentClick).toHaveBeenCalledTimes(0);
      expect(document.querySelector('[data-testid="radio"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('propagates a single click event to ancestors with a native button', async () => {
      const handleParentClick = vi.fn();
      function Demo() {
        return (
          <RadioGroup>
            <div onClick={handleParentClick}>
              <RadioRoot value="a" nativeButton render={<button />} data-testid="radio" />
            </div>
          </RadioGroup>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="radio"]') as HTMLElement);
      });

      expect(handleParentClick).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-testid="radio"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('does not propagate to ancestors when stopPropagation() is called with a native button', async () => {
      const handleParentClick = vi.fn();
      function Demo() {
        return (
          <RadioGroup>
            <div onClick={handleParentClick}>
              <RadioRoot
                value="a"
                nativeButton
                render={<button />}
                data-testid="radio"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </RadioGroup>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="radio"]') as HTMLElement);
      });

      expect(handleParentClick).toHaveBeenCalledTimes(0);
      expect(document.querySelector('[data-testid="radio"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('does not propagate a click to ancestors when selecting with arrow keys', async () => {
      const handleParentClick = vi.fn();
      function Demo() {
        return (
          <div onClick={handleParentClick}>
            <RadioGroup defaultValue="a">
              <RadioRoot value="a" data-testid="radio-a" />
              <RadioRoot value="b" data-testid="radio-b" />
            </RadioGroup>
          </div>
        );
      }

      await render(Demo, {});

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="radio-a"]') as HTMLElement);
      });
      handleParentClick.mockClear();

      await act(() => {
        fireEvent.keyDown(document.querySelector('[data-testid="radio-a"]') as HTMLElement, {
          key: 'ArrowDown',
        });
      });

      expect(document.querySelector('[data-testid="radio-b"]')).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(handleParentClick).toHaveBeenCalledTimes(0);
    });
  });

  describe('prop: disabled', () => {
    it('uses aria-disabled instead of HTML disabled', async () => {
      function Demo() {
        return (
          <RadioGroup>
            <RadioRoot value="a" disabled data-testid="radio" />
          </RadioGroup>
        );
      }

      await render(Demo, {});

      const radio = document.querySelector('[data-testid="radio"]') as HTMLElement;
      expect(radio).not.toHaveAttribute('disabled');
      expect(radio).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
