import { describe, expect, it } from 'vitest';
import { DirectionProvider } from '@/direction-provider/DirectionProvider';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { createRenderer } from '#/test/createRenderer';

const { render } = createRenderer();

function DirectionProbe() {
  const direction = useDirection();
  return <span data-testid="direction">{direction.value}</span>;
}

function DirectionProviderTest(props: any) {
  return (
    <DirectionProvider {...props}>
      <DirectionProbe />
    </DirectionProvider>
  );
}

describe('<DirectionProvider />', () => {
  it('defaults useDirection to ltr outside a provider', async () => {
    await render(DirectionProbe, {});

    const el = document.querySelector('[data-testid="direction"]');
    expect(el).not.toBe(null);
    expect(el).toHaveTextContent('ltr');
  });

  it('provides the configured direction to descendants', async () => {
    const result = await render(DirectionProviderTest, { direction: 'rtl' });

    const el = document.querySelector('[data-testid="direction"]');
    expect(el).toHaveTextContent('rtl');

    await result.setProps({ direction: 'ltr' });

    expect(el).toHaveTextContent('ltr');
  });
});
