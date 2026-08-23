import { expect } from 'vitest';
import { screen } from '#test-utils/rtl';
import { Separator } from '@/separator';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Separator />', () => {
  const { render } = createRenderer();

  describeConformance(<Separator />, () => ({
    render: (node) => render(node.type, { ...(node.props ?? {}) }),
    refInstanceof: window.HTMLDivElement,
  }));

  it('renders a div with the `separator` role', async () => {
    await render(Separator);
    expect(screen.getByRole('separator')).toBeVisible();
  });

  describe('prop: orientation', () => {
    ['horizontal', 'vertical'].forEach((orientation) => {
      it(orientation, async () => {
        await render(Separator, { orientation: orientation as Separator.Props['orientation'] });

        expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', orientation);
      });
    });
  });
});
