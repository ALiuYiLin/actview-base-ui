import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;
const Input = Combobox.Input;
const Clear = Combobox.Clear;
const List = Combobox.List;
const Item = Combobox.Item;
const Popup = Combobox.Popup;
const Positioner = Combobox.Positioner;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function ComboboxFixture(props: {rootProps?: any} = {}) {
  const {rootProps = {}} = props;
  return () => (
    <Root items={FRUITS} {...rootProps}>
      <Input data-testid="input" />
      <Clear data-testid="clear">x</Clear>
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

describe('<Combobox.Clear />', () => {
  it('clears the value', async () => {
    const onValueChange = vi.fn();
    await render(<ComboboxFixture rootProps={{defaultValue: 'apple', onValueChange}} />);
    await settle();
    await settle();

    fireEvent.click(screen.getByTestId('clear'));
    await settle();
    await settle();

    expect(onValueChange.mock.lastCall?.[0]).toBe(undefined);
    expect(screen.getByTestId('input')).toHaveValue('');
  });
});
