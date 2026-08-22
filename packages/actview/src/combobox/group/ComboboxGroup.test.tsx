import { describe, expect, it } from 'vitest';
import { ComboboxGroup } from '@/combobox/group/ComboboxGroup';
import { createRenderer } from '../../../test/createRenderer';

describe('<Combobox.Group />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <ComboboxGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role group', async () => {
    function Demo() {
      return <ComboboxGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toHaveAttribute('role', 'group');
  });
});