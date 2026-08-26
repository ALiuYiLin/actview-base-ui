import { describe, expect, it } from 'vitest';
import { Select } from '@/select';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Select.ItemIndicator />', () => {
  it('renders the ItemIndicator only for the selected item', async () => {
    await render(
      <Select.Root defaultValue="a">
        <Select.Trigger>Open</Select.Trigger>
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              <Select.Item value="a">A<Select.ItemIndicator data-testid="ind-a">✓</Select.ItemIndicator></Select.Item>
              <Select.Item value="b">B<Select.ItemIndicator data-testid="ind-b">✓</Select.ItemIndicator></Select.Item>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Root>,
    );
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    expect(screen.getByTestId('ind-a')).not.toBe(null);
    expect(screen.queryByTestId('ind-b')).toBe(null);
  });
});
