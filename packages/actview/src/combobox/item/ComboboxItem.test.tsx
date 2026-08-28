import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;
const Input = Combobox.Input;
const List = Combobox.List;
const Item = Combobox.Item;
const Popup = Combobox.Popup;
const Positioner = Combobox.Positioner;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function ComboboxFixture(props: {rootProps?: any} = {}) {
  const {rootProps = {}} = props;
  return (
    <Root items={FRUITS} {...rootProps}>
      <Input data-testid="input" />
      <Positioner>
        <Popup>
          <List>
            {({items}: any) =>
              items.map((item: any) => <Item key={item.value} value={item.value}>{item.label}</Item>)
            }
          </List>
        </Popup>
      </Positioner>
    </Root>
  );
}

describe('<Combobox.Item />', () => {
  it('selects an item on click and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<ComboboxFixture rootProps={{onValueChange}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'Cherry'}));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('cherry');
  });

  it('marks the selected item with data-selected', async () => {
    await render(<ComboboxFixture rootProps={{defaultValue: 'date'}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Date'})).toHaveAttribute('data-selected');
    expect(screen.getByRole('option', {name: 'Apple'})).not.toHaveAttribute('data-selected');
  });
});
