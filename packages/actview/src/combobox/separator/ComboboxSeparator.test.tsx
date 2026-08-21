import { describe, expect, it } from 'vitest';
import { ComboboxSeparator } from './ComboboxSeparator';
import { createRenderer } from '../../../test/createRenderer';

describe('<Combobox.Separator />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <ComboboxSeparator data-testid="separator" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('separator');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role presentation', async () => {
    function Demo() {
      return <ComboboxSeparator data-testid="separator" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('separator');
    expect(el).toHaveAttribute('role', 'presentation');
  });
});