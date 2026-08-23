import { describe, expect, it, vi } from 'vitest';
import { Select } from '@/select';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Select.Root;
const Trigger = Select.Trigger;
const Value = Select.Value;
const List = Select.List;
const Item = Select.Item;
const ItemIndicator = Select.ItemIndicator;
const Popup = Select.Popup;
const Positioner = Select.Positioner;

function BasicSelect(props: any = {}) {
  const {rootProps = {}} = props;
  return () => (
    <Root {...rootProps}>
      <Trigger>
        <Value placeholder="Choose..." />
      </Trigger>
      <Positioner>
        <Popup>
          <List>
            <Item value="apple">Apple</Item>
            <Item value="banana">Banana</Item>
            <Item value="cherry">Cherry</Item>
          </List>
        </Popup>
      </Positioner>
    </Root>
  );
}

describe('<Select.Root />', () => {
  it('renders the trigger with placeholder', async () => {
    await render(<BasicSelect />);
    await settle();

    expect(screen.getByText('Choose...')).not.toBe(null);
  });

  it('is closed by default', async () => {
    await render(<BasicSelect />);
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
  });

  it('opens the list on trigger click', async () => {
    await render(<BasicSelect />);
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Apple'})).not.toBe(null);
    expect(screen.getByRole('option', {name: 'Banana'})).not.toBe(null);
  });

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

  it('renders the selected value in Select.Value', async () => {
    await render(<BasicSelect rootProps={{defaultValue: 'cherry'}} />);
    await settle();
    await settle();

    expect(screen.getByText('cherry')).not.toBe(null);
  });

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

  it('renders the ItemIndicator only for the selected item', async () => {
    await render(
      <Root defaultValue="a">
        <Trigger>Open</Trigger>
        <Positioner>
          <Popup>
            <List>
              <Item value="a">A<ItemIndicator data-testid="ind-a">✓</ItemIndicator></Item>
              <Item value="b">B<ItemIndicator data-testid="ind-b">✓</ItemIndicator></Item>
            </List>
          </Popup>
        </Positioner>
      </Root>,
    );
    await settle();

    fireEvent.click(screen.getByRole('button'));
    await settle();
    await settle();

    expect(screen.getByTestId('ind-a')).not.toBe(null);
    expect(screen.queryByTestId('ind-b')).toBe(null);
  });

  it('supports the children render prop with state', async () => {
    await render(
      <Root defaultValue="x">
        {(state: any) => (
          <div data-testid={`state-${String(state.value)}-${state.open}-${state.multiple}`} />
        )}
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('state-x-false-false')).not.toBe(null);
  });

  it('is disabled when disabled', async () => {
    await render(<BasicSelect rootProps={{disabled: true}} />);
    await settle();

    expect(screen.getByRole('button')).toHaveAttribute('disabled');
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
