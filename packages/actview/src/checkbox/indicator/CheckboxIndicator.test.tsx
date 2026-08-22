import { describe, expect, it, vi } from 'vitest';
import { CheckboxRoot } from '@/checkbox/root/CheckboxRoot';
import { CheckboxIndicator } from '@/checkbox/indicator/CheckboxIndicator';
import { CheckboxRootContext } from '@/checkbox/root/CheckboxRootContext';
import type { CheckboxRootState } from '@/checkbox/root/CheckboxRoot';
import { createRenderer } from '../../../test/createRenderer';

const isJSDOM = navigator.userAgent.includes('jsdom');

const testContext: CheckboxRootState = {
  checked: true,
  disabled: false,
  readOnly: false,
  required: false,
  indeterminate: false,
  dirty: false,
  touched: false,
  valid: null,
  filled: false,
  focused: false,
};

describe('<Checkbox.Indicator />', () => {
  beforeEach(() => {
    (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders a span element (refInstanceof: HTMLSpanElement)', async () => {
    function Demo() {
      return (
        <CheckboxRootContext.Provider value={testContext}>
          <CheckboxIndicator data-testid="indicator" />
        </CheckboxRootContext.Provider>
      );
    }

    const result = await render(Demo, {});

    const indicator = result.getByTestId('indicator');
    expect(indicator).toBeInstanceOf(HTMLSpanElement);
  });

  it('throws a descriptive error when rendered outside <Checkbox.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      function Demo() {
        return <CheckboxIndicator />;
      }

      await render(Demo, {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining(
            'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
          ),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('should not render indicator by default', async () => {
    function Demo() {
      return (
        <CheckboxRoot>
          <CheckboxIndicator data-testid="indicator" />
        </CheckboxRoot>
      );
    }

    const result = await render(Demo, {});
    expect(result.queryByTestId('indicator')).toBe(null);
  });

  it('should render indicator when checked', async () => {
    function Demo() {
      return (
        <CheckboxRoot checked>
          <CheckboxIndicator data-testid="indicator" />
        </CheckboxRoot>
      );
    }

    const result = await render(Demo, {});
    console.log('container:', result.container.innerHTML);
    const indicator = result.getByTestId('indicator');
    expect(indicator).not.toBe(null);
  });

  it('should spread extra props', async () => {
    function Demo() {
      return (
        <CheckboxRoot defaultChecked>
          <CheckboxIndicator data-testid="indicator" data-extra-prop="Lorem ipsum" />
        </CheckboxRoot>
      );
    }

    const result = await render(Demo, {});
    const indicator = result.getByTestId('indicator');
    expect(indicator).toHaveAttribute('data-extra-prop', 'Lorem ipsum');
  });

  describe('prop: keepMounted', () => {
    it('should keep indicator mounted when unchecked', async () => {
      function Demo() {
        return (
          <CheckboxRoot>
            <CheckboxIndicator data-testid="indicator" keepMounted />
          </CheckboxRoot>
        );
      }

      const result = await render(Demo, {});
      const indicator = result.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });

    it('should keep indicator mounted when checked', async () => {
      function Demo() {
        return (
          <CheckboxRoot checked>
            <CheckboxIndicator data-testid="indicator" keepMounted />
          </CheckboxRoot>
        );
      }

      const result = await render(Demo, {});
      const indicator = result.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });

    it('should keep indicator mounted when indeterminate', async () => {
      function Demo() {
        return (
          <CheckboxRoot indeterminate>
            <CheckboxIndicator data-testid="indicator" keepMounted />
          </CheckboxRoot>
        );
      }

      const result = await render(Demo, {});
      const indicator = result.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });
  });

  it('should remove the indicator when there is no exit animation defined', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    function Demo() {
      return (
        <div>
          <button id="close-btn">Close</button>
          <CheckboxRoot checked={true}>
            <CheckboxIndicator data-testid="indicator" />
          </CheckboxRoot>
        </div>
      );
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('indicator')).not.toBe(null);

    const closeButton = document.getElementById('close-btn')!;

    await act(() => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(result.queryByTestId('indicator')).toBe(null);
    });
  });

  it('should remove the indicator when the animation finishes', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

    let animationFinished = false;
    const notifyAnimationFinished = () => {
      animationFinished = true;
    };

    const style = document.createElement('style');
    style.textContent = `
      @keyframes test-anim {
        to {
          opacity: 0;
        }
      }
      .animation-test-indicator[data-ending-style] {
        animation: test-anim 1ms;
      }
    `;
    document.head.appendChild(style);

    function Demo() {
      return (
        <div>
          <button id="close-btn">Close</button>
          <CheckboxRoot checked={true}>
            <CheckboxIndicator
              className="animation-test-indicator"
              data-testid="indicator"
              onAnimationEnd={notifyAnimationFinished}
              keepMounted
            />
          </CheckboxRoot>
        </div>
      );
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('indicator')).not.toBe(null);

    const closeButton = document.getElementById('close-btn')!;

    await act(() => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(animationFinished).toBe(true);
    });

    style.remove();
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      const notifyTransitionFinished = () => {
        transitionFinished = true;
      };

      const style = document.createElement('style');
      style.textContent = `
        .animation-test-indicator {
          transition: opacity 1ms;
        }
        .animation-test-indicator[data-starting-style],
        .animation-test-indicator[data-ending-style] {
          opacity: 0;
        }
      `;
      document.head.appendChild(style);

      function Demo() {
        return (
          <div>
            <button id="check-btn">Check</button>
            <CheckboxRoot checked={false}>
              <CheckboxIndicator
                className="animation-test-indicator"
                data-testid="indicator"
                onTransitionEnd={notifyTransitionFinished}
              />
            </CheckboxRoot>
          </div>
        );
      }

      const result = await render(Demo, {});
      expect(result.queryByTestId('indicator')).toBe(null);

      // Toggle checked to trigger enter animation
      const checkButton = document.getElementById('check-btn')!;

      await act(() => {
        fireEvent.click(checkButton);
      });

      // Wait for transition to finish
      await waitFor(() => {
        expect(transitionFinished).toBe(true);
      });

      expect(result.getByTestId('indicator')).not.toBe(null);

      style.remove();
    });

    it('applies data-ending-style before unmount', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }
        .animation-test-indicator[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;
      document.head.appendChild(style);

      function Demo() {
        return (
          <div>
            <button id="uncheck-btn">Uncheck</button>
            <CheckboxRoot checked={true}>
              <CheckboxIndicator
                className="animation-test-indicator"
                data-testid="indicator"
              />
            </CheckboxRoot>
          </div>
        );
      }

      const result = await render(Demo, {});
      expect(result.getByTestId('indicator')).not.toBe(null);

      const uncheckButton = document.getElementById('uncheck-btn')!;

      await act(() => {
        fireEvent.click(uncheckButton);
      });

      // Wait for data-ending-style to be applied
      await waitFor(() => {
        const indicator = result.queryByTestId('indicator');
        expect(indicator).not.toBe(null);
        expect(indicator).toHaveAttribute('data-ending-style');
      });

      // Wait for animation to finish and indicator to be removed
      await waitFor(() => {
        expect(result.queryByTestId('indicator')).toBe(null);
      });

      style.remove();
    });
  });
});