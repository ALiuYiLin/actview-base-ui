import { describe, expect, it } from 'vitest';
import { NavigationMenu } from '@/navigation-menu';
import { render, screen, act } from '#test-utils/rtl';

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

describe('<NavigationMenu.Root />', () => {
  it('is closed by default (popup not rendered)', async () => {
    await render(<BasicNavMenu />);
    await settle();

    expect(screen.queryByText('Analytics')).toBe(null);
  });

  it('supports defaultValue (opens on mount)', async () => {
    await render(<BasicNavMenu rootProps={{defaultValue: 'products'}} />);
    await settle();
    await settle();

    expect(screen.getByText('Analytics')).not.toBe(null);
  });

  it('renders the render prop with open state', async () => {
    await render(
      <Root data-testid="root">
        {(state: any) => <div data-testid={`state-${state.open}-${state.value}`} />}
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('state-false-null')).not.toBe(null);
  });

  it('adds data-modal when modal (default)', async () => {
    await render(<Root data-testid="root">Menu</Root>);
    await settle();

    expect(screen.getByTestId('root')).toHaveAttribute('data-modal');
  });
});
