import { describe, expect, it } from 'vitest';
import { Autocomplete } from '@/autocomplete';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Autocomplete.Root;
const Value = Autocomplete.Value;
const List = Autocomplete.List;
const Item = Autocomplete.Item;
const Popup = Autocomplete.Popup;
const Positioner = Autocomplete.Positioner;

const COLORS = {red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow'};

function AutocompleteFixture() {
  return () => (
    <Root items={COLORS} defaultValue="blue">
      <Value data-testid="value" />
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

describe('<Autocomplete.Value />', () => {
  it('renders the selected value', async () => {
    await render(<AutocompleteFixture />);
    await settle();
    await settle();

    expect(screen.getByTestId('value')).toHaveTextContent('blue');
  });
});
