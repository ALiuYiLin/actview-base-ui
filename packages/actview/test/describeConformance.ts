import { afterAll } from 'vitest';
import type { VNode } from '@actview/jsx';
import { createDescribe } from './test-utils';
import type { BaseUIRenderResult } from './createRenderer';
import { testClassName } from './conformanceTests/className';
import { testPropForwarding } from './conformanceTests/propForwarding';
import { testRefForwarding } from './conformanceTests/refForwarding';
import { testRenderProp } from './conformanceTests/renderProp';

/**
 * Props a conformant component accepts, as exercised by the conformance suite.
 * Mirrors the React contract (minus React-specific types).
 */
export type ConformantComponentProps = {
  render?: VNode | ((props: Record<string, unknown>) => unknown);
  'data-testid'?: string;
  className?: string | ((state: unknown) => string);
  style?: Record<string, string | number>;
  nativeButton?: boolean;
};

export interface BaseUiConformanceTestsOptions {
  /**
   * Renders the (cloned) element under test. ActView call sites map the VNode to
   * `createRenderer`:
   * ```ts
   * render: (node) => render(node.type, { ...(node.props ?? {}) }),
   * ```
   */
  render: (element: VNode) => Promise<BaseUIRenderResult>;
  /** Runs after all conformance tests. */
  after?: () => void;
  /** Only run these tests. */
  only?: (keyof typeof fullSuite)[];
  /** Skip these tests. */
  skip?: (keyof typeof fullSuite)[];
  /** The tag used as the customized root in render-prop tests (intrinsic tag name). @default 'div' */
  testRenderPropWith?: string;
  /** Whether the component under test is a button (forwards `nativeButton`). */
  button?: boolean;
  /** Whether the component may be wrapped in an extra element for testing. @default true */
  wrappingAllowed?: boolean;
  /** The expected constructor of the root element. */
  refInstanceof?: new (...args: any[]) => any;
}

const fullSuite = {
  propsSpread: testPropForwarding,
  refForwarding: testRefForwarding,
  renderProp: testRenderProp,
  className: testClassName,
};

function describeConformanceFn(
  minimalElement: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const { after: runAfterHook = () => {}, only = Object.keys(fullSuite), skip = [] } = getOptions();

  const filteredTests = Object.keys(fullSuite).filter(
    (testKey) =>
      only.indexOf(testKey) !== -1 && skip.indexOf(testKey as keyof typeof fullSuite) === -1,
  ) as (keyof typeof fullSuite)[];

  afterAll(runAfterHook);

  filteredTests.forEach((testKey) => {
    const test = fullSuite[testKey];
    test(minimalElement, getOptions as any);
  });
}

export const describeConformance = createDescribe('Base UI component API', describeConformanceFn);
