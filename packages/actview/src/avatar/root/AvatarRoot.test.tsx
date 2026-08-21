import { describe, expect, it } from 'vitest';
import { AvatarRoot } from './AvatarRoot';
import { createRenderer } from '../../../test/createRenderer';

describe('<Avatar.Root />', () => {
  const { render } = createRenderer();

  it('renders a span element (refInstanceof: HTMLSpanElement)', async () => {
    function Demo() {
      return <AvatarRoot data-testid="root" />;
    }

    const result = await render(Demo, {});

    const root = result.getByTestId('root');
    expect(root).toBeInstanceOf(HTMLSpanElement);
  });

  it('renders children', async () => {
    function Demo() {
      return (
        <AvatarRoot>
          <span data-testid="child" />
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    expect(result.getByTestId('child')).not.toBe(null);
  });

  it('forwards custom props to the default element', async () => {
    function Demo() {
      return <AvatarRoot data-testid="root" aria-label="avatar" />;
    }

    const result = await render(Demo, {});

    expect(result.getByTestId('root')).toHaveAttribute('aria-label', 'avatar');
  });
});