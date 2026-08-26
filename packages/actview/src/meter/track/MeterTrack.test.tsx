import { Meter } from '@/meter';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Meter.Track />', () => {
  const { render } = createRenderer();

  describeConformance(<Meter.Track />, () => ({
    render: (node) => render(Meter.Root, {value: 30, children: node}),
    refInstanceof: window.HTMLDivElement,
  }));
});
