import { describe, expect, it } from 'vitest';
import { ComboboxChip } from '@/combobox/chip/ComboboxChip';
import { ComboboxChipsContext } from '@/combobox/chips/ComboboxChipsContext';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { DirectionContext } from '@/internals/direction-context/DirectionContext';
import { createRenderer } from '../../../test/createRenderer';

const mockStore = {
  useState: (key: string) => {
    const values: Record<string, any> = {
      disabled: false,
      readOnly: false,
      selectedValue: ['apple'],
    };
    return { value: values[key] };
  },
  state: {
    inputRef: { current: null },
    setIndices: () => {},
    setSelectedValue: () => {},
    setOpen: () => {},
  },
  set: () => {},
} as any;

const chipsContext = {
  highlightedChipIndex: undefined,
  setHighlightedChipIndex: () => {},
  chipsRef: { current: [] },
};

describe('<Combobox.Chip />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <DirectionContext.Provider value="ltr">
          <ComboboxRootContext.Provider value={mockStore}>
            <ComboboxChipsContext.Provider value={chipsContext}>
              <ComboboxChip data-testid="chip" />
            </ComboboxChipsContext.Provider>
          </ComboboxRootContext.Provider>
        </DirectionContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('chip');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});