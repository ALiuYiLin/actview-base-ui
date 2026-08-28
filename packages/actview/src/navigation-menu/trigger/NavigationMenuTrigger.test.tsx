import { describe, expect, it } from 'vitest';
import { NavigationMenu } from '@/navigation-menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = NavigationMenu.Root;
const Trigger = NavigationMenu.Trigger;
const Positioner = NavigationMenu.Positioner;
const Popup = NavigationMenu.Popup;
const Content = NavigationMenu.Content;
const List = NavigationMenu.List;
const Item = NavigationMenu.Item;

function BasicNavMenu(props: any = {}) {
  const {rootProps = {}, triggerValue = 'products'} = props;
  return (
    <Root {...rootProps}>
      <Trigger value={triggerValue}>Products</Trigger>
      <Positioner>
        <Popup>
          <Content>
            <List>
              <Item value="analytics">Analytics</Item>
              <Item value="reports">Reports</Item>
            </List>
          </Content>
        </Popup>
      </Positioner>
    </Root>
  );
}

describe('<NavigationMenu.Trigger />', () => {
  it('renders the trigger', async () => {
    await render(<BasicNavMenu />);
    await settle();

    expect(screen.getByRole('button', {name: 'Products'})).not.toBe(null);
  });

  it('opens the popup on trigger click', async () => {
    await render(<BasicNavMenu />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Products'}));
    await settle();
    await settle();

    expect(screen.getByText('Analytics')).not.toBe(null);
    expect(screen.getByText('Reports')).not.toBe(null);
  });

  it('toggles closed on a second trigger click', async () => {
    await render(<BasicNavMenu />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Products'}));
    await settle();
    await settle();
    expect(screen.getByText('Analytics')).not.toBe(null);

    fireEvent.click(screen.getByRole('button', {name: 'Products'}));
    await settle();
    await settle();
    expect(screen.queryByText('Analytics')).toBe(null);
  });

  it('opens the popup on trigger mouse enter (hover)', async () => {
    await render(<BasicNavMenu />);
    await settle();

    fireEvent.mouseEnter(screen.getByRole('button', {name: 'Products'}));
    await settle();
    await settle();

    expect(screen.getByText('Analytics')).not.toBe(null);
  });
});
