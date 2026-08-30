import { ref } from 'actview';
import { Button } from '@actview/base-ui/button';
import { Popover } from '@actview/base-ui/popover';
import { defineComponent } from 'actview';
import { useFloating, FloatingFocusManager } from '@actview/floating-ui';

// ============================================================
// 调试案例 1：modal=false 内联 FFM（对照 React 版
// FloatingFocusManager.test.tsx "prop: modal > when false"）
// 结构：<button reference/> {open && <FloatingFocusManager modal={false}>
//   <div role="dialog" data-testid="floating">
//     <button one/><button two/><button three/>
//   </div>} <div last/>
// 既定行为（React 版 880-901 行与 actview 一致）：
//   click 打开 → tab×3（one→two→three→出浮层）→
//   第 3 次 tab 焦点移出浮层 → floating 关闭并从 DOM 移除
//   （React 898 行直接断言 queryByRole('dialog') 不存在）。
// actview 实测（本地 core 1.4.4 源码）：第 3 次 tab 后 floating=0，
// 与 React 参考完全一致——actview 行为正确。
// 注意：actview 测试（1039-1072 行）的手动 focusout 适配（focus last +
// focusOut(floating)）是基于旧 core 行为（tab 无法移出浮层）写的，
// 本地 core 1.4.4 修复渲染后 tab 可正确移出并关闭 → 适配代码失效。
// ============================================================
function InlineFFMApp() {
  const open = ref(false);
  const { refs, context } = useFloating({
    open,
    onOpenChange: (o: boolean) => {
      open.value = o;
    },
  });
  function click(){
    console.log('click: ');
    open.value = false
  }

  return (
    <>
      <button
        data-testid="reference"
        ref={refs.setReference}
        onClick={() => {
          open.value = !open.value;
        }}
      >
        Open
      </button>
      {open.value && (
        <FloatingFocusManager context={context} modal={false}>
          <div role="dialog" ref={refs.setFloating} data-testid="floating">
            <button data-testid="one">close</button>
            <button data-testid="two">confirm</button>
            <button data-testid="three" onClick={click}>
              x
            </button>
          </div>
        </FloatingFocusManager>
      )}
      <div tabIndex={0} data-testid="last">
        outside
      </div>
    </>
  );
}

/**
 * 手动调试 @actview/base-ui 组件的 playground 页。
 * 改 packages/actview/src 下的源码 → vite HMR 即时生效。
 */
export function App() {
  // setup：只执行一次
  const count = ref(0);
  const popoverOpen = ref(false);

  return (
    <div style="max-width: 720px; margin: 0 auto;">
      <h1>@actview/base-ui playground</h1>

      <section>
        <h2>Button</h2>
        <div class="row">
          <Button onClick={() => count.value++}>计数 {count.value}</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h2>Popover（Portal 版，带 data-slot）</h2>
        <Popover.Root open={popoverOpen.value} onOpenChange={(open: boolean) => (popoverOpen.value = open)}>
          <Popover.Trigger>打开 Popover</Popover.Trigger>
          <Popover.Portal data-slot="hover-card-portal">
            <Popover.Positioner>
              <Popover.Popup style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #fff;">
                <Popover.Title>标题</Popover.Title>
                <Popover.Description>这是 Popover 内容，点外部关闭。</Popover.Description>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </section>

      <section>
        <h2>Debug: modal=false 内联 FFM（对照 React "when false"）</h2>
        <p style="font-size: 13px; color: #666;">
          操作：点击 Open → Tab 三次。React 版与 actview（本地 core 1.4.4 源码）行为一致：
          第 3 次 Tab 焦点移出浮层 → floating 关闭并从 DOM 移除（React 测试 880-901 行直接
          断言 queryByRole('dialog') 不存在，无「提前关闭」）。用 DevTools 观察
          data-testid="floating" 的存在与 activeElement。
        </p>
        <InlineFFMApp />
      </section>
    </div>
  );
}
