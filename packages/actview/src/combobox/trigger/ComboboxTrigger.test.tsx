import { describe, expect, it } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;
const Trigger = Combobox.Trigger;
const List = Combobox.List;
const Item = Combobox.Item;
const Popup = Combobox.Popup;
const Positioner = Combobox.Positioner;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function ComboboxFixture() {
  return (
    <Root items={FRUITS}>
      <Trigger>Open</Trigger>
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

describe('<Combobox.Trigger />', () => {
  it('opens the list on trigger click', async () => {
    await render(<ComboboxFixture />);
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Open'}));
    await settle();
    await settle();

    expect(screen.getByRole('option', {name: 'Apple'})).not.toBe(null);
  });
});
