import { expect } from 'vitest';
import { defineComponent } from '@actview/core';
import { DirectionProvider, useDirection } from '@/direction-provider';
import type { TextDirection } from '@/direction-provider';
import { screen } from '#test-utils/rtl';
import { createRenderer } from '#test-utils';

const DirectionProbe = defineComponent(function () {
  const direction = useDirection();
  return () => <span data-testid="direction">{direction.value}</span>;
});

const DirectionProviderTest = defineComponent(function (props: { direction?: TextDirection }) {
  return () => (
    <DirectionProvider direction={props.direction}>
      <DirectionProbe />
    </DirectionProvider>
  );
});

describe('<DirectionProvider />', () => {
  const { render } = createRenderer();

  it('defaults useDirection to ltr outside a provider', async () => {
    await render(DirectionProbe);

    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });

  it('provides the configured direction to descendants', async () => {
    const { setProps } = await render(DirectionProviderTest, { direction: 'rtl' });

    expect(screen.getByTestId('direction')).toHaveTextContent('rtl');

    await setProps({ direction: 'ltr' });

    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });
});
