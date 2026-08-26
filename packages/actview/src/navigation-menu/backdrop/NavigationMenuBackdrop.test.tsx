import { describe, expect, it } from 'vitest';
import { NavigationMenu } from '@/navigation-menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = NavigationMenu.Root;
const Trigger = NavigationMenu.Trigger;
const Backdrop = NavigationMenu.Backdrop;

describe('<NavigationMenu.Backdrop />', () => {
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
});
