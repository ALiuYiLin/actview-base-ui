import { describe, expect, it } from 'vitest';
import { CSPProvider } from '@/csp-provider/CSPProvider';
import { useCSPContext } from '@/internals/csp-context/CspContext';
import { createRenderer } from '#/test/createRenderer';

const { render } = createRenderer();

function CSPProbe() {
  const csp = useCSPContext();
  return (
    <>
      <span data-testid="nonce">{csp.value.nonce ?? ''}</span>
      <span data-testid="disable-style">
        {csp.value.disableStyleElements ? 'true' : 'false'}
      </span>
    </>
  );
}

function CSPProviderTest(props: any) {
  return (
    <CSPProvider {...props}>
      <CSPProbe />
    </CSPProvider>
  );
}

describe('<CSPProvider />', () => {
  it('defaults to empty nonce and disabled style elements false outside a provider', async () => {
    await render(CSPProbe, {});

    const nonce = document.querySelector('[data-testid="nonce"]');
    const disableStyle = document.querySelector('[data-testid="disable-style"]');
    expect(nonce).toHaveTextContent('');
    expect(disableStyle).toHaveTextContent('false');
  });

  it('provides nonce to descendants', async () => {
    const result = await render(CSPProviderTest, { nonce: 'test-nonce' });

    const nonce = document.querySelector('[data-testid="nonce"]');
    expect(nonce).toHaveTextContent('test-nonce');

    await result.setProps({ nonce: 'new-nonce' });

    expect(nonce).toHaveTextContent('new-nonce');
  });

  it('provides disableStyleElements to descendants', async () => {
    const result = await render(CSPProviderTest, { disableStyleElements: true });

    const disableStyle = document.querySelector('[data-testid="disable-style"]');
    expect(disableStyle).toHaveTextContent('true');

    await result.setProps({ disableStyleElements: false });

    expect(disableStyle).toHaveTextContent('false');
  });
});
