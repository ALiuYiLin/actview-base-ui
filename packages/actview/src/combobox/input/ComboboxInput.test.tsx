import { describe, expect, it } from 'vitest';
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

function BasicCombobox(props: any = {}) {
  const {rootProps = {}} = props;
  return () => (
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

describe('<Combobox.Input />', () => {
  it('renders the input', async () => {
    await render(<BasicCombobox />);
    await settle();

    expect(screen.getByTestId('input')).not.toBe(null);
  });

  it('opens the list on input focus', async () => {
    await render(<BasicCombobox />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Apple'})).not.toBe(null);
  });

  it('filters items as the user types', async () => {
    await render(<BasicCombobox />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.input(screen.getByTestId('input'), {target: {value: 'an'}});
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Banana'})).not.toBe(null);
    expect(screen.queryByRole('option', {name: 'Apple'})).toBe(null);
  });

  it('is disabled when disabled', async () => {
    await render(<BasicCombobox rootProps={{disabled: true}} />);
    await settle();

    expect(screen.getByTestId('input')).toHaveAttribute('disabled');
  });
});
