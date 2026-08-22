import { expect } from 'vitest';
import { defineComponent } from 'actview';
import { AccordionHeader } from '@/accordion/header/AccordionHeader';
import {
  AccordionItemContext,
  type AccordionItemContext as AccordionItemContextValue,
} from '@/accordion/item/AccordionItemContext';
import { createRenderer, describeConformance } from '#test-utils';

const testContext: AccordionItemContextValue = {
  defaultTriggerId: undefined,
  open: true,
  state: {
    value: [],
    disabled: false,
    orientation: 'horizontal',
    hidden: false,
    index: 0,
    open: true,
  },
  setTriggerId: () => {},
  triggerId: undefined,
};

// React 原版用 <Accordion.Root><Accordion.Item>{node}</Accordion.Item></Accordion.Root> 包裹；
// actview 的 Root/Item 尚未迁移，等价物是直接注入 AccordionItemContext（MIGRATION.md 案例 5：
// 渲染期读 context → 官方 createContext 的 Provider 传值即可）。
const AccordionHeaderTestWrapper = defineComponent(function (props: { node: any }) {
  return () => (
    <AccordionItemContext.Provider value={testContext}>
      {props.node}
    </AccordionItemContext.Provider>
  );
});

describe('<AccordionHeader />', () => {
  const { render } = createRenderer();

  it('throws when rendered outside an Accordion.Item', async () => {
    // actview 的 setup 错误会 rethrow 给 render 调用方（与 React 原版
    // `rejects.toThrow` 断言一致）
    function Demo() {
      return <AccordionHeader />;
    }

    await expect(render(Demo, {})).rejects.toThrow(
      'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
    );
  });

  describeConformance(<AccordionHeader />, () => ({
    render: (node) => render(AccordionHeaderTestWrapper, { node }),
    refInstanceof: window.HTMLHeadingElement,
  }));
});
