import { describe, expect, it } from 'vitest';
import { ComboboxIcon } from '@/combobox/icon/ComboboxIcon';
import { createRenderer } from '../../../test/createRenderer';

describe('<Combobox.Icon />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return <ComboboxIcon data-testid="icon" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('icon');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('has aria-hidden attribute', async () => {
    function Demo() {
      return <ComboboxIcon data-testid="icon" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('icon');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});