import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

describe('<Menu.Group />', () => {
  it('renders a div with the `group` role', async () => {
    await render(<Menu.Group />);
    await act(async () => {});
    expect(screen.getByRole('group')).toBeVisible();
  });
});
