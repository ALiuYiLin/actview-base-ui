import { describe, expect, it } from 'vitest';
import { Select } from '@/select';
import { render, screen, act } from '#test-utils/rtl';

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

describe('<Select.Value />', () => {
  it('renders the trigger with placeholder', async () => {
    await render(<BasicSelect />);
    await settle();

    expect(screen.getByText('Choose...')).not.toBe(null);
  });

  it('renders the selected value in Select.Value', async () => {
    await render(<BasicSelect rootProps={{defaultValue: 'cherry'}} />);
    await settle();
    await settle();

    expect(screen.getByText('cherry')).not.toBe(null);
  });
});
