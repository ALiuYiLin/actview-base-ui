import { describe, expect, it } from 'vitest';
import { SelectIcon } from '@/select/icon/SelectIcon';
import { SelectRootContext } from '@/select/root/SelectRootContext';
import { createRenderer } from '#/test/createRenderer';

const mockRootContext = {
  store: {
    useState: (key: string) => {
      const values: Record<string, any> = {
        open: false,
      };
      return { value: values[key] };
    },
    state: {},
  },
};

describe('<Select.Icon />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return (
        <SelectRootContext.Provider value={mockRootContext as any}>
          <SelectIcon data-testid="icon" />
        </SelectRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('icon');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('has aria-hidden attribute', async () => {
    function Demo() {
      return (
        <SelectRootContext.Provider value={mockRootContext as any}>
          <SelectIcon data-testid="icon" />
        </SelectRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('icon');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});