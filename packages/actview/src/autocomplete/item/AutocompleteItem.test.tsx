import { describe, expect, it, vi } from 'vitest';
import { Autocomplete } from '@/autocomplete';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Autocomplete.Root;
const Input = Autocomplete.Input;
const List = Autocomplete.List;
const Item = Autocomplete.Item;
const Popup = Autocomplete.Popup;
const Positioner = Autocomplete.Positioner;

const COLORS = {red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow'};

function AutocompleteFixture(props: {rootProps?: any} = {}) {
  const {rootProps = {}} = props;
  return () => (
    <Root items={COLORS} {...rootProps}>
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

describe('<Autocomplete.Item />', () => {
  it('selects an item on click and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<AutocompleteFixture rootProps={{onValueChange}} />);
    await settle();

    fireEvent.focus(screen.getByTestId('input'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('option', {name: 'Green'}));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe('green');
  });
});
