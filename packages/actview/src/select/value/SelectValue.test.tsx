import { describe, expect, it } from 'vitest';
import { SelectValue } from '@/select/value/SelectValue';
import { SelectRootContext } from '@/select/root/SelectRootContext';
import { createRenderer } from '../../../test/createRenderer';

const mockRootContext = {
  store: {
    useState: (key: string) => {
      const values: Record<string, any> = {
        value: 'apple',
        items: ['apple', 'banana'],
        itemToStringLabel: (v: any) => v,
        hasSelectedValue: true,
      };
      return { value: values[key] };
    },
    state: {},
  },
  valueRef: { current: null },
};

describe('<Select.Value />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return (
        <SelectRootContext.Provider value={mockRootContext as any}>
          <SelectValue data-testid="value" />
        </SelectRootContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('value');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });
});