import { describe, expect, it, vi } from 'vitest';
import { Autocomplete } from '@/autocomplete';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Autocomplete.Root;
const Input = Autocomplete.Input;
const Trigger = Autocomplete.Trigger;
const Value = Autocomplete.Value;
const List = Autocomplete.List;
const Item = Autocomplete.Item;
const Popup = Autocomplete.Popup;
const Positioner = Autocomplete.Positioner;

const COLORS = {red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow'};

function BasicAutocomplete(props: any = {}) {
  const {rootProps = {}, withTrigger = false} = props;
  return () => (
    <Root items={COLORS} {...rootProps}>
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

describe('<Autocomplete.Root />', () => { (globalThis as any).__DSH_AC_DEBUG = true;
  it('renders the input', async () => {
    await render(<BasicAutocomplete />);
    await settle();

    expect(screen.getByTestId('input')).not.toBe(null);
  });

  it('opens the list on input focus', async () => {
    await render(<BasicAutocomplete />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Red'})).not.toBe(null);
  });

  it('is closed by default', async () => {
    await render(<BasicAutocomplete />);
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
  });

  it('opens on trigger click', async () => {
    await render(<BasicAutocomplete withTrigger />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Open'}));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Red'})).not.toBe(null);
  });

  it('filters items as the user types', async () => {
    await render(<BasicAutocomplete />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.input(screen.getByTestId('input'), {target: {value: 'bl'}});
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Blue'})).not.toBe(null);
    expect(screen.queryByRole('option', {name: 'Red'})).toBe(null);
  });

  it('selects an item on click and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<BasicAutocomplete rootProps={{onValueChange}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'Green'}));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('green');
  });

  it('renders the selected value in Autocomplete.Value', async () => {
    await render(
      <Root items={COLORS} defaultValue="blue">
        <Value data-testid="value" />
        <Positioner><Popup><List>{({items}: any) =>
          items.map((item: any) => <Item key={item.value} value={item.value}>{item.label}</Item>)
        }</List></Popup></Positioner>
      </Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('value')).toHaveTextContent('blue');
  });

  it('supports the children render prop with open state', async () => {
    await render(
      <Root items={COLORS}>
        {(state: any) => <div data-testid={`state-${state.open}-${state.inputValue}`} />}
      </Root>,
    );
    await settle();

    expect(screen.getByTestId('state-false-')).not.toBe(null);
  });

  it('is disabled when disabled', async () => {
    await render(<BasicAutocomplete rootProps={{disabled: true}} />);
    await settle();

    expect(screen.getByTestId('input')).toHaveAttribute('disabled');
  });
});




