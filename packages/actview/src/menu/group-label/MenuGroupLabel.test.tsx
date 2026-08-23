import { describe, expect, it, vi } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.GroupLabel />', () => {
  it('should have the role `presentation`', async () => {
    await render(
      <Menu.Group>
        <Menu.GroupLabel>Label</Menu.GroupLabel>
      </Menu.Group>,
    );
    await settle();
    expect(screen.getByText('Label')).toHaveAttribute('role', 'presentation');
  });

  it("should reference the generated id in Group's `aria-labelledby`", async () => {
    await render(
      <Menu.Group>
        <Menu.GroupLabel>Label</Menu.GroupLabel>
      </Menu.Group>,
    );
    await settle();

    const group = screen.getByRole('group');
    const label = screen.getByText('Label');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });
});
