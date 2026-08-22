import { describe, expect, it } from 'vitest';
import { MenuGroup } from '@/menu/group/MenuGroup';
import { createRenderer } from '#/test/createRenderer';

describe('<Menu.Group />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <MenuGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('has role group', async () => {
    function Demo() {
      return <MenuGroup data-testid="group" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('group');
    expect(el).toHaveAttribute('role', 'group');
  });
});