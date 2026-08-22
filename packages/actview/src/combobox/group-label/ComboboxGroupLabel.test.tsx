import { describe, expect, it } from 'vitest';
import { ComboboxGroupLabel } from '@/combobox/group-label/ComboboxGroupLabel';
import { ComboboxGroupContext } from '@/combobox/group/ComboboxGroupContext';
import { createRenderer } from '#/test/createRenderer';

let labelId: string | undefined;
const setLabelId = (next: string | undefined | ((current: string | undefined) => string | undefined)) => {
  labelId = typeof next === 'function' ? next(labelId) : next;
};

const groupContext = {
  labelId: undefined,
  setLabelId,
  items: undefined,
};

describe('<Combobox.GroupLabel />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    labelId = undefined;
  });

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ComboboxGroupContext.Provider value={groupContext}>
          <ComboboxGroupLabel data-testid="label" />
        </ComboboxGroupContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('label');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('sets the label id on the group context', async () => {
    function Demo() {
      return (
        <ComboboxGroupContext.Provider value={groupContext}>
          <ComboboxGroupLabel data-testid="label" />
        </ComboboxGroupContext.Provider>
      );
    }

    await render(Demo, {});
    expect(labelId).toBeDefined();
    expect(typeof labelId).toBe('string');
  });
});