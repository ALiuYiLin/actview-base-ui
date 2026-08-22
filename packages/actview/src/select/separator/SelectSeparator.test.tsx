import { describe, expect, it } from 'vitest';
import { SelectSeparator } from '@/select/separator/SelectSeparator';
import { createRenderer } from '../../../test/createRenderer';

describe('<Select.Separator />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <SelectSeparator data-testid="separator" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('separator');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role presentation', async () => {
    function Demo() {
      return <SelectSeparator data-testid="separator" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('separator');
    expect(el).toHaveAttribute('role', 'presentation');
  });
});