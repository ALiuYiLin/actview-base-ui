import { describe, expect, it, vi } from 'vitest';
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
  return () => (
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

describe('<NavigationMenu.Item />', () => {
  it('calls onValueChange when an item is clicked', async () => {
    const onValueChange = vi.fn();
    await render(<BasicNavMenu rootProps={{onValueChange}} />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Products'}));
    await settle();
    await settle();

    fireEvent.click(screen.getByText('Analytics'));
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('analytics');
  });
});
