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
const Link = NavigationMenu.Link;
const Backdrop = NavigationMenu.Backdrop;
const Viewport = NavigationMenu.Viewport;

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
  it('renders the trigger', async () => {
    await render(<BasicNavMenu />);
    await settle();

    expect(screen.getByRole('button', {name: 'Products'})).not.toBe(null);
  });

  it('is closed by default (popup not rendered)', async () => {
    await render(<BasicNavMenu />);
    await settle();

    expect(screen.queryByText('Analytics')).toBe(null);
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

  it('toggles closed on a second trigger click', async () => { (globalThis as any).__DSH_NM_DEBUG = true;
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

  it('renders the backdrop only when open', async () => {
    await render(
      <Root>
        <Trigger value="a">A</Trigger>
        <Backdrop data-testid="backdrop" />
      </Root>,
    );
    await settle();

    expect(screen.queryByTestId('backdrop')).toBe(null);

    fireEvent.click(screen.getByRole('button', {name: 'A'}));
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop')).not.toBe(null);
  });

  it('renders a link with href', async () => {
    await render(
      <Root>
        <Link href="/docs" data-testid="link">Docs</Link>
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('link')).toHaveAttribute('href', '/docs');
  });

  it('renders the viewport', async () => {
    await render(
      <Root>
        <Viewport data-testid="viewport">Content</Viewport>
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('viewport')).not.toBe(null);
  });
});


