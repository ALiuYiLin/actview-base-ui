import { Avatar } from '@/avatar';
import { describeConformance, createRenderer } from '#test-utils';

describe('<Avatar.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Avatar.Root />, () => ({
    render: (node) => render(node.type, { ...(node.props ?? {}) }),
    refInstanceof: window.HTMLSpanElement,
  }));
});
