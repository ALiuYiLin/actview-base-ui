import { describe, expect, it } from 'vitest';
import { ref } from 'actview';
import { FieldsetRoot } from '@/fieldset/root/FieldsetRoot';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldControl } from '@/field/control/FieldControl';
import { createRenderer } from '#/test/createRenderer';

const { render, fireEvent, act } = createRenderer();

describe('<Fieldset.Root />', () => {
  it('sets the native disabled attribute', async () => {
    function Demo() {
      return (
        <FieldsetRoot disabled data-testid="fieldset">
          <input />
        </FieldsetRoot>
      );
    }

    await render(Demo, {});

    const fieldset = document.querySelector('[data-testid="fieldset"]') as HTMLElement;
    expect(fieldset).toHaveAttribute('disabled');
    expect(document.querySelector('input')).toBeDisabled();
  });

  it('keeps nested fieldsets disabled when an ancestor fieldset is disabled', async () => {
    function Demo() {
      return (
        <FieldsetRoot disabled>
          <FieldsetRoot>
            <FieldRoot>
              <FieldControl data-testid="control" />
            </FieldRoot>
          </FieldsetRoot>
        </FieldsetRoot>
      );
    }

    await render(Demo, {});

    // disabled 传递是跨组件异步链（fieldset context → FieldRoot → FieldControl），需要 flush
    await act(() => {});

    expect(document.querySelector('[data-testid="control"]')).toHaveAttribute('disabled');
  });

  it('updates nested disabled precedence in both directions', async () => {
    function NestedDisabledDemo() {
      const outerDisabled = ref(false);
      const innerDisabled = ref(true);

      return (
        <>
          <FieldsetRoot disabled={outerDisabled.value}>
            <FieldsetRoot disabled={innerDisabled.value}>
              <FieldRoot data-testid="root">
                <FieldControl data-testid="control" />
              </FieldRoot>
            </FieldsetRoot>
          </FieldsetRoot>
          <button
            type="button"
            data-testid="disable-outer"
            onClick={() => {
              outerDisabled.value = true;
            }}
          >
            Disable outer
          </button>
          <button
            type="button"
            data-testid="enable-inner"
            onClick={() => {
              innerDisabled.value = false;
            }}
          >
            Enable inner
          </button>
          <button
            type="button"
            data-testid="enable-outer"
            onClick={() => {
              outerDisabled.value = false;
            }}
          >
            Enable outer
          </button>
        </>
      );
    }

    await render(NestedDisabledDemo, {});

    // 初始 disabled 传递是跨组件异步链，需要 flush
    await act(() => {});

    const control = document.querySelector('[data-testid="control"]') as HTMLElement;
    const root = document.querySelector('[data-testid="root"]') as HTMLElement;
    expect(control).toBeDisabled();
    expect(root).toHaveAttribute('data-disabled');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="disable-outer"]') as HTMLElement);
      fireEvent.click(document.querySelector('[data-testid="enable-inner"]') as HTMLElement);
    });
    // 三层 watch 链（fieldset context → FieldRoot → FieldControl）需要额外 flush
    await act(() => {});
    expect(control).toBeDisabled();
    expect(root).toHaveAttribute('data-disabled');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="enable-outer"]') as HTMLElement);
    });
    await act(() => {});
    expect(control).not.toBeDisabled();
    expect(root).not.toHaveAttribute('data-disabled');
  });

  // TODO refactor component: RadioGroup / Checkbox / Slider 家族重构后，搜索
  // `TODO refactor component` 取消注释本用例。
  // React 原版：Fieldset disabled 传递到 render 的 Base UI 根组件——
  //   RadioGroup → aria-disabled="true"；Checkbox.Root → data-disabled；
  //   Slider.Control → data-disabled。
  // actview 现状跑不通：RadioGroup 的 disabled computed 不含 fieldsetContext、
  // Checkbox/Slider 不消费 fieldset context（且 RadioGroup 无 aria-disabled 输出）。
  // 导入（取消注释时启用）：
  //   import { RadioGroup } from '@/radio-group/RadioGroup';
  //   import { CheckboxGroup } from '@/checkbox-group/CheckboxGroup';
  //   import { CheckboxRoot } from '@/checkbox/root/CheckboxRoot';
  //   import { SliderRoot } from '@/slider/root/SliderRoot';
  //   import { SliderControl } from '@/slider/control/SliderControl';
  //   import { SliderTrack } from '@/slider/track/SliderTrack';
  //   import { SliderThumb } from '@/slider/thumb/SliderThumb';
  /*
  it('passes disabled to rendered Base UI roots', async () => {
    function Demo() {
      return (
        <div>
          <FieldsetRoot disabled render={<RadioGroup data-testid="radio-group" />} />
          <FieldsetRoot disabled render={<CheckboxGroup />}>
            <CheckboxRoot name="apple" data-testid="checkbox" />
          </FieldsetRoot>
          <FieldsetRoot disabled render={<SliderRoot defaultValue={50} />}>
            <SliderControl data-testid="slider-control">
              <SliderTrack>
                <SliderThumb />
              </SliderTrack>
            </SliderControl>
          </FieldsetRoot>
        </div>
      );
    }

    await render(Demo, {});

    expect(document.querySelector('[data-testid="radio-group"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(document.querySelector('[data-testid="checkbox"]')).toHaveAttribute('data-disabled');
    expect(document.querySelector('[data-testid="slider-control"]')).toHaveAttribute(
      'data-disabled',
    );
  });
  */
});
