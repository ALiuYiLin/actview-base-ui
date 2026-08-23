import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '#test-utils/rtl';
import { Menu } from '@/menu';

async function settle() {
  // actview 渲染异步：多次 nextTick/rAF 等待浮层挂载
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });
    });
  }
}

describe('<Menu.Root /> (actview smoke)', () => {
  it('opens and closes the menu via trigger click', async () => {
    await renderMenu();

    const trigger = screen.getByRole('button', {name: 'Open menu'});
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);

    await settle();

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', {name: 'Item 1'})).toBeInTheDocument();

    // 点击 item 关闭菜单
    fireEvent.mouseUp(screen.getByRole('menuitem', {name: 'Item 1'}));
    fireEvent.click(screen.getByRole('menuitem', {name: 'Item 1'}));

    await settle();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('highlights items with keyboard navigation', async () => {
    await renderMenu();

    const trigger = screen.getByRole('button', {name: 'Open menu'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);

    await settle();

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);

    fireEvent.keyDown(items[0], {key: 'ArrowDown'});
    await settle();
    expect(items[1]).toHaveAttribute('data-highlighted');
  });
});

async function renderMenu() {
  const {render} = await import('#test-utils/rtl');
  return render(
    <Menu.Root>
      <Menu.Trigger>Open menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>Item 1</Menu.Item>
            <Menu.Item>Item 2</Menu.Item>
            <Menu.Item>Item 3</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>,
  );
}



describe('<Menu.Root /> with selection items (actview smoke)', () => {
  it('checks and unchecks a checkbox item, selects radio values', async () => {
    await renderSelectionMenu();
    const trigger = screen.getByRole('button', {name: 'Open menu'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    const checkbox = screen.getByRole('menuitemcheckbox');
    expect(checkbox).toHaveAttribute('data-unchecked');
    fireEvent.mouseUp(checkbox);
    fireEvent.click(checkbox);
    await settle();
    expect(checkbox).toHaveAttribute('data-checked');

    const radios = screen.getAllByRole('menuitemradio');
    expect(radios).toHaveLength(2);
    fireEvent.mouseUp(radios[1]);
    fireEvent.click(radios[1]);
    await settle();
    expect(radios[1]).toHaveAttribute('data-checked');
    expect(radios[0]).toHaveAttribute('data-unchecked');
  });
});

async function renderSelectionMenu() {
  const {render} = await import('#test-utils/rtl');
  return render(
    <Menu.Root>
      <Menu.Trigger>Open menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.CheckboxItem>Bold</Menu.CheckboxItem>
            <Menu.RadioGroup defaultValue="left">
              <Menu.RadioItem value="left">Left</Menu.RadioItem>
              <Menu.RadioItem value="right">Right</Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>,
  );
}
