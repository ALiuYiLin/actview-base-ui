import { describe, expect, it, vi } from 'vitest';
import { SwitchRoot } from '@/switch/root/SwitchRoot';
import { SwitchThumb } from '@/switch/thumb/SwitchThumb';
import { SwitchRootContext } from '@/switch/root/SwitchRootContext';
import { createRenderer } from '#/test/createRenderer';

const testContext: SwitchRootContext = {
  checked: false,
  disabled: false,
  readOnly: false,
  required: false,
  dirty: false,
  touched: false,
  filled: false,
  focused: false,
  valid: null,
};

describe('<Switch.Thumb />', () => {
  const { render } = createRenderer();

  it('renders a span element (refInstanceof: HTMLSpanElement)', async () => {
    function Demo() {
      return (
        <SwitchRoot>
          <SwitchThumb data-testid="thumb" />
        </SwitchRoot>
      );
    }

    const result = await render(Demo, {});

    const thumb = result.getByTestId('thumb');
    expect(thumb).toBeInstanceOf(HTMLSpanElement);
  });

  it('throws a descriptive error when rendered outside <Switch.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      function Demo() {
        return <SwitchThumb />;
      }

      await expect(render(Demo, {})).rejects.toThrow(
        'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});