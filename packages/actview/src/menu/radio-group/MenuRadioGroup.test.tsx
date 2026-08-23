import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

describe('<Menu.RadioGroup />', () => {
  it('renders a div with the `group` role', async () => {
    await render(<Menu.RadioGroup />);
    await act(async () => {});
    expect(screen.getByRole('group')).toBeVisible();
  });
});
