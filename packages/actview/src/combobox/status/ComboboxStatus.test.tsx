import { describe, expect, it } from 'vitest';
import { ComboboxStatus } from './ComboboxStatus';
import { createRenderer } from '../../../test/createRenderer';

describe('<Combobox.Status />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <ComboboxStatus data-testid="status" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('status');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role status and aria-live polite', async () => {
    function Demo() {
      return <ComboboxStatus data-testid="status">Loading...</ComboboxStatus>;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('status');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el).toHaveAttribute('aria-atomic', 'true');
  });
});