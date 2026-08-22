import { useCSPContext } from '@/internals/csp-context/CspContext';

/**
 * Renders an inline script that runs before a framework hydrates, used by components that
 * need to position server-rendered content ahead of hydration (e.g. `Tabs.Indicator`,
 * `Slider.Thumb`).
 *
 * ActView components are mounted client-side, so the server branch (`typeof document ===
 * 'undefined'`) never runs in the browser: the script is emitted only when the component is
 * rendered during server-side rendering, and nothing is rendered on the client. The
 * `script` source is imported directly by the caller (there is no `#prehydration/*` subpath
 * mapping in the ActView package).
 *
 * Render this only when the script should be emitted (i.e. gate `renderBeforeHydration`
 * and any structural conditions at the call site).
 */
export function PrehydrationScript(props: PrehydrationScript.Props) {
  const { script } = props;
  const csp = useCSPContext();

  const isServer = typeof document === 'undefined';

  if (!isServer) {
    return null;
  }

  return <script nonce={csp.value.nonce} dangerouslySetInnerHTML={{ __html: script }} />;
}

export namespace PrehydrationScript {
  export interface Props {
    /**
     * The script source. Empty in client bundles when imported through a subpath mapping;
     * the ActView package imports the real script source directly.
     */
    script: string;
  }
}
