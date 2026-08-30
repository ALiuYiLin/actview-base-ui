import { ref } from 'actview';
import { Button } from '@actview/base-ui/button';
import { Popover } from '@actview/base-ui/popover';
import { PreviewCard } from '@actview/base-ui/preview-card';
import { ToggleGroup } from '@actview/base-ui/toggle-group';
import { Toggle } from '@actview/base-ui/toggle';

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
        <h2>Popover</h2>
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
        <h2>Popover</h2>
        <Popover.Root open={popoverOpen.value} onOpenChange={(open: boolean) => (popoverOpen.value = open)}>
          <Popover.Trigger>打开 Popover</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #fff;">
                <Popover.Title>标题</Popover.Title>
                <Popover.Description>这是 Popover 内容，点外部关闭。</Popover.Description>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </section>
    </div>
  );
}
