import { expect } from 'vitest';
import { nextTick } from 'actview';
import { Toolbar } from '@/toolbar';
import { ToggleGroup } from '@/toggle-group';
import { Toggle } from '@/toggle';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

describe('<Toolbar.Group />', () => {
  const { render } = createRenderer();

  it('renders a group with role="group"', async () => {
    await render(
      Toolbar.Root,
      {children: (<Toolbar.Group><Toolbar.Button children={null} /></Toolbar.Group>)},
    );

    expect(document.querySelector('[role="group"]')).toBeInTheDocument();
  });

  it('toggle group inside toolbar still toggles', async () => {
    await render(
      Toolbar.Root,
      {
        children: (
          <ToggleGroup.Root>
            <Toggle.Root value="a" children={null} />
          </ToggleGroup.Root>
        ),
      },
    );

    const button = document.querySelector('button') as HTMLButtonElement;
    fireEvent.click(button);
    await nextTick();
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
