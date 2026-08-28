import { describe, expect, it } from 'vitest';
import { Select } from '@/select';
import { render, screen, act } from '#test-utils/rtl';

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

describe('<Select.Root />', () => {
  it('is closed by default', async () => {
    await render(<BasicSelect />);
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
  });

  it('supports the children render prop with state', async () => {
    await render(
      <Select.Root defaultValue="x">
        {(state: any) => (
          <div data-testid={`state-${String(state.value)}-${state.open}-${state.multiple}`} />
        )}
      </Select.Root>,
    );
    await settle();

    expect(screen.getByTestId('state-x-false-false')).not.toBe(null);
  });

  it('is disabled when disabled', async () => {
    await render(<BasicSelect rootProps={{disabled: true}} />);
    await settle();

    expect(screen.getByRole('button')).toHaveAttribute('disabled');
  });
});
