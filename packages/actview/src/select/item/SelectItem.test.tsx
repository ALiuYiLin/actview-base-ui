import { describe, expect, it, vi } from 'vitest';
import { Select } from '@/select';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function BasicSelect(props: any = {}) {
  const {rootProps = {}} = props;
  return (
    <Select.Root {...rootProps}>
      <Select.Trigger>
        <Select.Value placeholder="Choose..." />
      </Select.Trigger>
      <Select.Positioner>
        <Select.Popup>
          <Select.List>
            <Select.Item value="apple">Apple</Select.Item>
            <Select.Item value="banana">Banana</Select.Item>
            <Select.Item value="cherry">Cherry</Select.Item>
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Root>
  );
}

describe('<Select.Item />', () => {
  it('selects an item on click and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<BasicSelect rootProps={{onValueChange}} />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'Banana'}));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('banana');
  });

  it('marks the selected item with data-selected', async () => {
    await render(<BasicSelect rootProps={{defaultValue: 'apple'}} />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Apple'})).toHaveAttribute('data-selected');
    expect(screen.getByRole('option', {name: 'Banana'})).not.toHaveAttribute('data-selected');
  });
});
