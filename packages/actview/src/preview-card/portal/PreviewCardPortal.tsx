import { defineComponent, toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import { PreviewCardPortalContext } from './PreviewCardPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export const PreviewCardPortal = defineComponent(function PreviewCardPortal(props: PreviewCardPortal.Props) {
  const {keepMounted = false, ...portalProps} = props;

  const store = usePreviewCardRootContext(false);
  const mounted = store.useState('mounted');

  return () => {
    const shouldRender = mounted.value || keepMounted;
    if (!shouldRender) {
      return null;
    }

    return (
      <PreviewCardPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...(portalProps as any)} />
      </PreviewCardPortalContext.Provider>
    );
  };
});

export interface PreviewCardPortalState {}

export interface PreviewCardPortalProps {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?:
    | HTMLElement
    | ShadowRoot
    | {current: HTMLElement | ShadowRoot | null}
    | null
    | undefined;
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardPortal {
  export type State = PreviewCardPortalState;
  export type Props = PreviewCardPortalProps;
}
