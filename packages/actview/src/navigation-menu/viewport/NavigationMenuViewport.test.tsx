import { describe, expect, it } from 'vitest';
import { NavigationMenu } from '@/navigation-menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = NavigationMenu.Root;
const Viewport = NavigationMenu.Viewport;

describe('<NavigationMenu.Viewport />', () => {
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
