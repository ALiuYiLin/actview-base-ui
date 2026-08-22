import { describe, expect, it } from 'vitest';
import { SelectGroup } from '@/select/group/SelectGroup';
import { createRenderer } from '#/test/createRenderer';

describe('<Select.Group />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <SelectGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role group', async () => {
    function Demo() {
      return <SelectGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toHaveAttribute('role', 'group');
  });
});