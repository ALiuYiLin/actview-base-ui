import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Field } from '@/field';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Field.Validity />', () => {
  const { render } = createRenderer();

  it('passes validity state to the children render prop', async () => {
    const renderSpy = vi.fn((validity: any) => <div>validity</div>);
    const Test = defineComponent(function () {
      return () => (
        <Field.Root invalid={true}>
          <Field.Validity>{renderSpy as any}</Field.Validity>
        </Field.Root>
      );
    });

    await render(Test);

    expect(renderSpy).toHaveBeenCalled();
    const state = renderSpy.mock.calls[0][0];
    expect(state.validity).toBeDefined();
    expect(state.validity.valid).toBe(false);
    // transitionStatus 是动画状态（rAF 后可能已转 undefined）
    expect(screen.getByText('validity')).toBeInTheDocument();
  });
});


