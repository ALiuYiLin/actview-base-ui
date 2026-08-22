import { describe, expect, it } from 'vitest';
import { ComboboxRow } from '@/combobox/row/ComboboxRow';
import { createRenderer } from '../../../test/createRenderer';

describe('<Combobox.Row />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <ComboboxRow data-testid="row" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('row');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role row', async () => {
    function Demo() {
      return <ComboboxRow data-testid="row" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('row');
    expect(el).toHaveAttribute('role', 'row');
  });
});