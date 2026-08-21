import { describe, expect, it } from 'vitest';
import { MenuGroupLabel } from './MenuGroupLabel';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { createRenderer } from '../../../test/createRenderer';

let labelId: string | undefined;
const setLabelId = (next: string | undefined | ((current: string | undefined) => string | undefined)) => {
  labelId = typeof next === 'function' ? next(labelId) : next;
};

const groupContext = setLabelId as any;

describe('<Menu.GroupLabel />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    labelId = undefined;
  });

  it('renders a div element', async () => {
    function Demo() {
      return (
        <MenuGroupContext.Provider value={groupContext}>
          <MenuGroupLabel data-testid="label" />
        </MenuGroupContext.Provider>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('label');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('sets the label id on the group context', async () => {
    function Demo() {
      return (
        <MenuGroupContext.Provider value={groupContext}>
          <MenuGroupLabel data-testid="label" />
        </MenuGroupContext.Provider>
      );
    }

    await render(Demo, {});
    expect(labelId).toBeDefined();
    expect(typeof labelId).toBe('string');
  });
});