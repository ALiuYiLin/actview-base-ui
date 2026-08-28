import { describe, expect, it } from 'vitest';
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

describe('<Select.Popup />', () => {
  it('closes the popup after selecting', async () => {
    await render(<BasicSelect />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'Apple'}));
    await settle();
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
  });
});
