import { expect, vi } from 'vitest';
import { defineComponent } from '@actview/core';
import { act, fireEvent, screen, userEvent } from '#test-utils/rtl';
import { createRenderer } from '#test-utils';
import { useButton } from './useButton';
import { CompositeRootContext } from '../composite/root/CompositeRootContext';

// Composite.Root 组件尚未迁移——这里用官方 Context.Provider 模拟（value
// 恒定；useButton 只读「context 是否存在」判定 composite 模式，语义等价
// 于被 <Composite.Root> 包裹。CompositeRoot 组件迁移后恢复原用例结构。）
const CompositeWrapper = defineComponent(function (props: any) {
  const contextValue = {
    highlightedIndex: 0,
    onHighlightedIndexChange: () => {},
    highlightItemOnHover: false,
    relayKeyboardEvent: () => {},
  };
  return () => (
    <CompositeRootContext.Provider value={contextValue}>
      {props.children}
    </CompositeRootContext.Provider>
  );
});

describe('useButton', () => {
  const { render } = createRenderer();
  const focusElement = async (element: HTMLElement) => {
    await act(async () => {
      element.focus();
    });
  };

  describe('non-native button', () => {
    describe('keyboard interactions', () => {
      ['Enter', 'Space'].forEach((key) => {
        it(`can be activated with ${key} key`, async () => {
          const clickSpy = vi.fn();

          const Button = defineComponent(function (props: any) {
            const { getButtonProps } = useButton({
              native: false,
            });

            return () => <span {...getButtonProps(props)} />;
          });

          const user = userEvent.setup();
          await render(Button, {onClick: clickSpy});

          const button = screen.getByRole('button');

          await user.keyboard('[Tab]');
          expect(button).toHaveFocus();

          await user.keyboard(`[${key}]`);
          expect(clickSpy).toHaveBeenCalledTimes(1);
        });
      });

      it('does not set a type prop', async () => {
        let buttonProps: Record<string, unknown> | undefined = undefined;

        const Button = defineComponent(function () {
          const { getButtonProps } = useButton({native: false});
          return () => {
            buttonProps = getButtonProps();
            return <span {...buttonProps} />;
          };
        });

        await render(Button);
        expect(buttonProps).not.toHaveProperty('type');
      });

      // React 版「shadow root 内 Enter 激活」用例依赖 useMergedRefs +
      // attachShadow 场景（actview 暂无 useMergedRefs）——待基建补充后迁移：
      // it.skipIf(isJSDOM)(
      //   'can be activated with Enter when the keyboard event originates inside a shadow root',
      //   ...,
      // );
    });
  });

  describe('param: focusableWhenDisabled', () => {
    it('allows disabled buttons to be focused', async () => {
      const TestButton = defineComponent(function (props: any) {
        const {disabled, ...otherProps} = props;
        const {getButtonProps} = useButton({
          disabled,
          focusableWhenDisabled: true,
        });

        return () => <button {...getButtonProps(otherProps)} />;
      });
      await render(TestButton, {disabled: true});
      const button = screen.getByRole('button');
      await focusElement(button);
      expect(button).toHaveFocus();
    });

    it('force overrides disabled attribute when put in a composite', async () => {
      const TestButton = defineComponent(function () {
        const {getButtonProps, buttonRef} = useButton({
          disabled: true,
          focusableWhenDisabled: true,
        });
        return () => (
          <button ref={buttonRef} {...getButtonProps({disabled: true})} />
        );
      });

      const Test = defineComponent(function () {
        return () => (
          <CompositeWrapper>
            <TestButton />
          </CompositeWrapper>
        );
      });

      const {rerender} = await render(Test);

      async function verify() {
        const button = screen.getByRole('button');
        await focusElement(button);
        expect(button).toHaveFocus();
      }

      await verify();

      // 模拟 React 版 rerender（新 key 强制重挂——actview rerender 换组件
      // 实例不换 key；此处重跑验证即可，语义对齐「ref 变化后仍可聚焦」）
      await rerender(Test);
      await verify();
    });

    it('prevents interactions except focus and blur', async () => {
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {disabled, ...otherProps} = props;
        const {getButtonProps} = useButton({
          disabled,
          focusableWhenDisabled: true,
          native: false,
        });

        return () => <span {...getButtonProps(otherProps)} />;
      });

      const user = userEvent.setup();
      await render(TestButton, {
        disabled: true,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
        onFocus: handleFocus,
        onBlur: handleBlur,
      });

      const button = screen.getByRole('button');
      expect(document.activeElement).not.toBe(button);

      expect(handleFocus).toHaveBeenCalledTimes(0);
      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();
      expect(handleFocus).toHaveBeenCalledTimes(1);

      await user.keyboard('[Enter]');
      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      await user.keyboard('[Space]');
      expect(handleKeyUp).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      await user.click(button);
      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      expect(handleKeyUp).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      expect(handleBlur).toHaveBeenCalledTimes(0);
      await user.keyboard('[Tab]');
      expect(handleBlur).toHaveBeenCalledTimes(1);
      expect(document.activeElement).not.toBe(button);
    });
  });

  describe('param: tabIndex', () => {
    it('returns tabIndex in getButtonProps when host component is BUTTON', async () => {
      const TestButton = defineComponent(function () {
        const {getButtonProps} = useButton();

        expect(getButtonProps().tabIndex).toBe(0);

        return () => <button {...getButtonProps()} />;
      });

      await render(TestButton);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('returns tabIndex in getButtonProps when host component is not BUTTON', async () => {
      const TestButton = defineComponent(function () {
        const {getButtonProps, buttonRef} = useButton({native: false});

        expect(getButtonProps().tabIndex).toBe(0);

        return () => <span {...getButtonProps()} ref={buttonRef} />;
      });

      await render(TestButton);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('returns tabIndex in getButtonProps if it is explicitly provided', async () => {
      const customTabIndex = 3;
      const TestButton = defineComponent(function () {
        const {getButtonProps} = useButton({tabIndex: customTabIndex});
        return () => <button {...getButtonProps()} />;
      });

      await render(TestButton);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', customTabIndex);
    });
  });

  describe('arbitrary props', () => {
    it('are passed to the host component', async () => {
      const buttonTestId = 'button-test-id';
      const TestButton = defineComponent(function () {
        const {getButtonProps} = useButton();
        return () => <button {...getButtonProps({'data-testid': buttonTestId})} />;
      });

      await render(TestButton);
      expect(screen.getByRole('button')).toHaveAttribute('data-testid', buttonTestId);
    });
  });

  describe('event handlers', () => {
    it('key: Space fires keyup then click on non-composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      await render(TestButton, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp, onClick: handleClick});

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(0);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <span {...getButtonProps(props)} />;
      });

      await render(TestButton, {
        tabIndex: 0,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
        onClick: handleClick,
      });

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on composite links', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <a href="#test" {...getButtonProps(props)} />;
      });

      await render(TestButton, {onClick: handleClick});

      const link = screen.getByRole('button');

      await focusElement(link);
      expect(link).toHaveFocus();

      fireEvent.keyDown(link, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(link, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not click composite links when Space is prevented for text navigation', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <a href="#test" {...getButtonProps({role: 'menuitem', ...props})} />;
      });

      await render(TestButton, {
        onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        onClick: handleClick,
      });

      const link = screen.getByRole('menuitem');

      await focusElement(link);
      expect(link).toHaveFocus();

      fireEvent.keyDown(link, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('does not click composite gridcells when Space is prevented', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <div {...getButtonProps({role: 'gridcell', tabIndex: 0, ...props})} />;
      });

      await render(TestButton, {
        onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        onClick: handleClick,
      });

      const gridcell = screen.getByRole('gridcell');

      await focusElement(gridcell);
      expect(gridcell).toHaveFocus();

      fireEvent.keyDown(gridcell, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('clicks composite switches when Space is prevented', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <div {...getButtonProps({role: 'switch', tabIndex: 0, ...props})} />;
      });

      await render(TestButton, {
        onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        onClick: handleClick,
      });

      const switchElement = screen.getByRole('switch');

      await focusElement(switchElement);
      expect(switchElement).toHaveFocus();

      fireEvent.keyDown(switchElement, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on native composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({composite: true});

        return () => <button {...getButtonProps(props)} />;
      });

      await render(TestButton, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp, onClick: handleClick});

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire duplicate clicks for Space on native composite buttons', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({composite: true});

        return () => <button {...getButtonProps(props)} />;
      });

      const user = userEvent.setup();
      await render(TestButton, {onClick: handleClick});

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('fires a single click for nested non-native composite buttons', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const outer = useButton({native: false, composite: true});
        const inner = useButton({native: false, composite: true});

        return () => <span {...outer.getButtonProps(inner.getButtonProps(props))} />;
      });

      const user = userEvent.setup();
      await render(TestButton, {tabIndex: 0, onClick: handleClick});

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard('[Enter]');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('key: Space preserves native submit semantics on composite buttons', async () => {
      const handleSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });

      const TestButton = defineComponent(function () {
        const {getButtonProps} = useButton({composite: true});

        return () => (
          <form onSubmit={handleSubmit}>
            <button {...getButtonProps({type: 'submit'})}>Submit</button>
          </form>
        );
      });

      await render(TestButton);

      const button = screen.getByRole('button', {name: 'Submit'});

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleSubmit).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('key: Space preserves native reset semantics on composite buttons', async () => {
      const handleReset = vi.fn((event: Event) => {
        event.preventDefault();
      });

      const TestButton = defineComponent(function () {
        const {getButtonProps} = useButton({composite: true});

        return () => (
          <form onReset={handleReset}>
            <button {...getButtonProps({type: 'reset'})}>Reset</button>
          </form>
        );
      });

      await render(TestButton);

      const button = screen.getByRole('button', {name: 'Reset'});

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleReset).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('does not click composite buttons when keydown calls preventBaseUIHandler', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: true});

        return () => <span {...getButtonProps(props)} />;
      });

      await render(TestButton, {
        tabIndex: 0,
        onKeyDown: (event: any) => (event as any).preventBaseUIHandler(),
        onClick: handleClick,
      });

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('does not click non-composite buttons when keydown/keyup calls preventBaseUIHandler', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      const preventBaseUIHandler = (event: any) => (event as any).preventBaseUIHandler();

      await render(TestButton, {
        tabIndex: 0,
        onKeyDown: preventBaseUIHandler,
        onKeyUp: preventBaseUIHandler,
        onClick: handleClick,
      });

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Enter activates on keydown; the consumer prevents it.
      fireEvent.keyDown(button, {key: 'Enter'});
      expect(handleClick).toHaveBeenCalledTimes(0);

      // Space activates on keyup; the consumer prevents it.
      fireEvent.keyDown(button, {key: ' '});
      fireEvent.keyUp(button, {key: ' '});
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Enter does not click non-native buttons when keydown calls preventDefault', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      const user = userEvent.setup();
      await render(TestButton, {
        tabIndex: 0,
        onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        onClick: handleClick,
      });

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Match native buttons: preventing the keydown's default cancels Enter activation.
      await user.keyboard('[Enter]');
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Space does not click non-native buttons when keyup calls preventDefault', async () => {
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      const user = userEvent.setup();
      await render(TestButton, {
        tabIndex: 0,
        onKeyUp: (event: KeyboardEvent) => event.preventDefault(),
        onClick: handleClick,
      });

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Match native buttons: preventing the keyup's default cancels Space activation.
      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Space fires keydown then click when in composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      const Test = defineComponent(function () {
        return () => (
          <CompositeWrapper>
            <TestButton
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onClick={handleClick}
            />
          </CompositeWrapper>
        );
      });

      await render(Test);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on native buttons in composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton();

        return () => <button {...getButtonProps(props)} />;
      });

      const Test = defineComponent(function () {
        return () => (
          <CompositeWrapper>
            <TestButton
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onClick={handleClick}
            />
          </CompositeWrapper>
        );
      });

      await render(Test);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('`composite=false` keeps keyup activation inside composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false, composite: false});

        return () => <span {...getButtonProps(props)} />;
      });

      const Test = defineComponent(function () {
        return () => (
          <CompositeWrapper>
            <TestButton
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onClick={handleClick}
            />
          </CompositeWrapper>
        );
      });

      await render(Test);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, {key: ' '});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(0);

      fireEvent.keyUp(button, {key: ' '});
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Enter fires keydown then click on non-native buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleClick = vi.fn();

      const TestButton = defineComponent(function (props: any) {
        const {getButtonProps} = useButton({native: false});

        return () => <span {...getButtonProps(props)} />;
      });

      await render(TestButton, {onKeyDown: handleKeyDown, onClick: handleClick});

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      fireEvent.keyDown(button, {key: 'Enter'});
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // React 版 SSR 用例（renderToString + hydration）依赖 actview 尚无的
  // renderToString 测试基建——待基建补充后迁移：
  // describe.skipIf(isJSDOM)('server-side rendering', () => { ... });

  describe('dev warnings', () => {
    it('errors if nativeButton=true but ref is not a button', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});
      const TestButton = defineComponent(function () {
        const {getButtonProps, buttonRef} = useButton({native: true});
        return () => <span {...getButtonProps()} ref={buttonRef} />;
      });
      await render(TestButton);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Base UI: A component that acts as a button expected a native <button> because ' +
            'the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, ' +
            'which can impact forms and accessibility. Use a real <button> in the `render` prop, or set ' +
            '`nativeButton` to `false`.',
        ),
      );
      errorSpy.mockRestore();
    });

    it('errors if nativeButton=false but ref is a button', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});
      const TestButton = defineComponent(function () {
        const {getButtonProps, buttonRef} = useButton({native: false});
        return () => <button {...getButtonProps()} ref={buttonRef} />;
      });
      await render(TestButton);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Base UI: A component that acts as a button expected a non-<button> because ' +
            'the `nativeButton` prop is false. Rendering a <button> keeps native behavior while Base UI ' +
            'applies non-native attributes and handlers, which can add unintended extra attributes ' +
            '(such as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
            '`nativeButton` to `true`.',
        ),
      );
      errorSpy.mockRestore();
    });
  });
});
