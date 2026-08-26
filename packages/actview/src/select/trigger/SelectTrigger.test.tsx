import { describe, expect, it } from 'vitest';
import { Select } from '@/select';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function BasicSelect(props: any = {}) {
  const {rootProps = {}} = props;
  return () => (
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

describe('<Select.Trigger />', () => {
  it('opens the list on trigger click', async () => {
    await render(<BasicSelect />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Apple'})).not.toBe(null);
    expect(screen.getByRole('option', {name: 'Banana'})).not.toBe(null);
  });

  it('toggles closed on a second trigger click', async () => {
    await render(<BasicSelect />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();
    expect(screen.queryAllByRole('option').length).toBe(0);
  });
});
