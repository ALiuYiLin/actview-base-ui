import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

describe('<Menu.Arrow />', () => {
  it('renders an aria-hidden div inside an open menu', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Arrow data-testid="arrow" />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await act(async () => {});

    const arrow = screen.getByTestId('arrow');
    expect(arrow).toBeInstanceOf(window.HTMLDivElement);
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });
});
