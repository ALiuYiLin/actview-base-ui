import { describe, expect, it } from 'vitest';
import { SelectGroupLabel } from '@/select/group-label/SelectGroupLabel';
import { SelectGroupContext } from '@/select/group/SelectGroupContext';
import { createRenderer } from '#/test/createRenderer';

let labelId: string | undefined;
const setLabelId = (next: string | undefined | ((prev: string | undefined) => string | undefined)) => {
  labelId = typeof next === 'function' ? (next as (prev: string | undefined) => string | undefined)(labelId) : next;
};

const groupContext = {
  labelId: undefined,
  setLabelId,
};

describe('<Select.GroupLabel />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    labelId = undefined;
  });

  it('renders a div element', async () => {
    function Demo() {
      return (
        <SelectGroupContext.Provider value={groupContext}>
          <SelectGroupLabel data-testid="label" />
        </SelectGroupContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('label');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});