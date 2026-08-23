import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;
const Input = Combobox.Input;
const Trigger = Combobox.Trigger;
const Value = Combobox.Value;
const List = Combobox.List;
const Item = Combobox.Item;
const Popup = Combobox.Popup;
const Positioner = Combobox.Positioner;
const Clear = Combobox.Clear;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function BasicCombobox(props: any = {}) {
  const {rootProps = {}, withTrigger = false} = props;
  return () => (
    <Root items={FRUITS} {...rootProps}>
      {withTrigger ? <Trigger>Open</Trigger> : <Input data-testid="input" />}
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

describe('<Combobox.Root />', () => {
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

    expect(screen.getByRole('option', {name: 'apple'})).not.toBe(null);
  });

  it('is closed by default', async () => {
    await render(<BasicCombobox />);
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
  });

  it('opens on trigger click', async () => {
    await render(<BasicCombobox withTrigger />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Open'}));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'apple'})).not.toBe(null);
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

    expect(screen.getByRole('option', {name: 'banana'})).not.toBe(null);
    expect(screen.queryByRole('option', {name: 'apple'})).toBe(null);
  });

  it('selects an item on click and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<BasicCombobox rootProps={{onValueChange}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'cherry'}));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('cherry');
  });

  it('marks the selected item with data-selected', async () => {
    await render(<BasicCombobox rootProps={{defaultValue: 'date'}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'date'})).toHaveAttribute('data-selected');
    expect(screen.getByRole('option', {name: 'apple'})).not.toHaveAttribute('data-selected');
  });

  it('renders the selected value in Combobox.Value', async () => {
    await render(
      <Root items={FRUITS} defaultValue="banana">
        <Value data-testid="value" />
        <Positioner><Popup><List>{({items}: any) =>
          items.map((item: any) => <Item key={item.value} value={item.value}>{item.label}</Item>)
        }</List></Popup></Positioner>
      </Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('value')).toHaveTextContent('banana');
  });

  it('clears the value via Combobox.Clear', async () => {
    const onValueChange = vi.fn();
    await render(
      <Root items={FRUITS} defaultValue="apple" onValueChange={onValueChange}>
        <Input data-testid="input" />
        <Clear data-testid="clear">x</Clear>
        <Positioner><Popup><List>{({items}: any) =>
          items.map((item: any) => <Item key={item.value} value={item.value}>{item.label}</Item>)
        }</List></Popup></Positioner>
      </Root>,
    );
    await settle();
    await settle();

    fireEvent.click(screen.getByTestId('clear'));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe(undefined);
    expect(screen.getByTestId('input')).toHaveValue('');
  });

  it('supports the children render prop with open state', async () => {
    await render(
      <Root items={FRUITS}>
        {(state: any) => <div data-testid={`state-${state.open}-${state.inputValue}`} />}
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('state-false-')).not.toBe(null);
  });

  it('is disabled when disabled', async () => {
    await render(<BasicCombobox rootProps={{disabled: true}} />);
    await settle();

    expect(screen.getByTestId('input')).toHaveAttribute('disabled');
  });
});
