import { expect } from 'vitest';
import { Toolbar } from '@/toolbar';
import { ToggleGroup } from '@/toggle-group';
import { Toggle } from '@/toggle';
import { createRenderer } from '#test-utils';

describe('<Toolbar.Root />', () => {
  const { render } = createRenderer();

  it('renders role="toolbar" with aria-orientation', async () => {
    await render(Toolbar.Root, {children: null});

    const root = document.querySelector('[role="toolbar"]') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders buttons', async () => {
    await render(
      Toolbar.Root,
      {children: (<><Toolbar.Button children={null} /><Toolbar.Button children={null} /></>)},
    );

    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('renders separators between items', async () => {
    await render(
      Toolbar.Root,
      {children: (<><Toolbar.Button children={null} /><Toolbar.Separator /></>)},
    );

    expect(document.querySelector('[role="separator"]')).toBeInTheDocument();
  });

  it('nested ToggleGroup inside Toolbar renders toggle buttons', async () => {
    await render(
      Toolbar.Root,
      {
        children: (
          <ToggleGroup.Root>
            <Toggle.Root value="a" children={null} />
            <Toggle.Root value="b" children={null} />
          </ToggleGroup.Root>
        ),
      },
    );

    expect(document.querySelectorAll('button').length).toBe(2);
  });
});
