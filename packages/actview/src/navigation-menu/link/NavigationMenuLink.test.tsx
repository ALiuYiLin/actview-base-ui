import { describe, expect, it } from 'vitest';
import { NavigationMenu } from '@/navigation-menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = NavigationMenu.Root;
const Link = NavigationMenu.Link;

describe('<NavigationMenu.Link />', () => {
  it('renders a link with href', async () => {
    await render(
      <Root>
        <Link href="/docs" data-testid="link">Docs</Link>
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('link')).toHaveAttribute('href', '/docs');
  });
});
