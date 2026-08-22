import { describe, expect, it } from 'vitest';
import { ref } from 'actview';
import { RadioGroup } from '@/radio-group/RadioGroup';
import { RadioRoot } from '@/radio/root/RadioRoot';
import { RadioIndicator } from '@/radio/indicator/RadioIndicator';
import { createRenderer } from '../../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

describe('<Radio.Indicator />', () => {
  // React 原版动画相关用例依赖真实浏览器动画/transition 事件（jsdom 无），
  // 全部 skip 保留（Chromium 环境可用时取消 skip）。

  it.skip('should remove the indicator when there is no exit animation defined', async () => {
    function Test() {
      const value = ref('a');
      return (
        <div>
          <button
            type="button"
            data-testid="close"
            onClick={() => {
              value.value = 'b';
            }}
          >
            Close
          </button>
          <RadioGroup value={value.value}>
            <RadioRoot value="a">
              <RadioIndicator className="animation-test-indicator" data-testid="indicator-a" />
            </RadioRoot>
            <RadioRoot value="a">
              <RadioIndicator className="animation-test-indicator" />
            </RadioRoot>
          </RadioGroup>
        </div>
      );
    }

    await render(Test, {});

    expect(document.querySelector('[data-testid="indicator-a"]')).not.toBe(null);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="close"]') as HTMLElement);
    });

    expect(document.querySelector('[data-testid="indicator-a"]')).toBe(null);
  });

  it.skip('should remove the indicator when the animation finishes', async () => {
    let animationFinished = false;
    const notifyAnimationFinished = () => {
      animationFinished = true;
    };

    function Test() {
      const value = ref('a');
      return (
        <div>
          <button
            type="button"
            data-testid="close"
            onClick={() => {
              value.value = 'b';
            }}
          >
            Close
          </button>
          <RadioGroup value={value.value}>
            <RadioRoot value="a">
              <RadioIndicator
                className="animation-test-indicator"
                keepMounted
                onAnimationEnd={notifyAnimationFinished}
                data-testid="indicator-a"
              />
            </RadioRoot>
            <RadioRoot value="a">
              <RadioIndicator className="animation-test-indicator" keepMounted />
            </RadioRoot>
          </RadioGroup>
        </div>
      );
    }

    await render(Test, {});

    expect(document.querySelector('[data-testid="indicator-a"]')).not.toBe(null);

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="close"]') as HTMLElement);
    });

    expect(animationFinished).toBe(true);
  });

  describe.skip('animations (Chromium env only)', () => {
    it('triggers enter animation via data-starting-style when mounting', async () => {
      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      function Test() {
        const value = ref('b');
        return (
          <div>
            <button
              type="button"
              data-testid="select-a"
              onClick={() => {
                value.value = 'a';
              }}
            >
              Select a
            </button>
            <RadioGroup value={value.value}>
              <RadioRoot value="a">
                <RadioIndicator
                  className="animation-test-indicator"
                  data-testid="indicator-a"
                  onTransitionEnd={notifyTransitionFinished}
                />
              </RadioRoot>
              <RadioRoot value="b">
                <RadioIndicator className="animation-test-indicator" data-testid="indicator-b" />
              </RadioRoot>
            </RadioGroup>
          </div>
        );
      }

      await render(Test, {});
      expect(document.querySelector('[data-testid="indicator-a"]')).toBe(null);

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="select-a"]') as HTMLElement);
      });

      expect(transitionFinished).toBe(true);
      expect(document.querySelector('[data-testid="indicator-a"]')).not.toBe(null);
    });

    it('applies data-ending-style before unmount', async () => {
      function Test() {
        const value = ref('a');
        return (
          <div>
            <button
              type="button"
              data-testid="select-b"
              onClick={() => {
                value.value = 'b';
              }}
            >
              Select b
            </button>
            <RadioGroup value={value.value}>
              <RadioRoot value="a">
                <RadioIndicator
                  className="animation-test-indicator"
                  data-testid="indicator-a"
                />
              </RadioRoot>
              <RadioRoot value="b">
                <RadioIndicator className="animation-test-indicator" data-testid="indicator-b" />
              </RadioRoot>
            </RadioGroup>
          </div>
        );
      }

      await render(Test, {});
      expect(document.querySelector('[data-testid="indicator-a"]')).not.toBe(null);

      await act(() => {
        fireEvent.click(document.querySelector('[data-testid="select-b"]') as HTMLElement);
      });

      expect(document.querySelector('[data-testid="indicator-a"]')).toHaveAttribute(
        'data-ending-style',
      );
    });
  });
});
