import { describe, expect, it } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;
const Input = Combobox.Input;
const Value = Combobox.Value;
const List = Combobox.List;
const Item = Combobox.Item;
const Popup = Combobox.Popup;
const Positioner = Combobox.Positioner;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function ComboboxFixture() {
  return () => (
    <Root items={FRUITS} defaultValue="banana">
      <Input data-testid="input" />
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

describe('<Combobox.Value />', () => {
  it('renders the selected value', async () => {
    await render(<ComboboxFixture />);
    await settle();
    await settle();

    expect(screen.getByTestId('value')).toHaveTextContent('banana');
  });
});
