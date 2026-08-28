import { describe, expect, it } from 'vitest';
import { Combobox } from '@/combobox';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

const Root = Combobox.Root;

const FRUITS = {apple: 'Apple', banana: 'Banana', cherry: 'Cherry', date: 'Date', elderberry: 'Elderberry'};

function ComboboxFixture() {
  return (
    <Root items={FRUITS}>
      <Combobox.Input data-testid="input" />
      <Combobox.Positioner>
        <Combobox.Popup>
          <Combobox.List>
            {({items}: any) =>
              items.map((item: any) => <Combobox.Item key={item.value} value={item.value}>{item.label}</Combobox.Item>)
            }
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Root>
  );
}

describe('<Combobox.Root />', () => {
  it('is closed by default', async () => {
    await render(<ComboboxFixture />);
    await settle();

    expect(screen.queryByRole('option')).toBe(null);
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
});
