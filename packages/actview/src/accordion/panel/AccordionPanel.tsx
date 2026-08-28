import {computed, onUnmounted, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCollapsiblePanel } from '@/collapsible/panel/useCollapsiblePanel';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import type { AccordionRoot } from '../root/AccordionRoot';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { AccordionPanelCssVars } from '../AccordionDataAttributes';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）。⚠️ state/hiddenUntilFound/keepMounted 等
  // getter 字段——不解构（解构会捕获快照），经属性访问路由。
  const rootContext = useAccordionRootContext();
  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setPanelIdState,
    setOpen,
    transitionStatus,
  } = useCollapsibleRootContext();

  const hiddenUntilFound = computed(
    () => componentProps.hiddenUntilFound ?? rootContext.hiddenUntilFound.value,
  );
  const keepMounted = computed(
    () => componentProps.keepMounted ?? rootContext.keepMounted.value,
  );
  const registeredId = computed(() => componentProps.id || undefined);
  const id = computed(() => componentProps.id ?? defaultPanelId);

  // dev 警告：keepMounted={false} + hiddenUntilFound
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [keepMounted.value, hiddenUntilFound.value] as const,
      ([keepMountedProp, hiddenUntilFoundValue]) => {
        if (keepMountedProp === false && hiddenUntilFoundValue) {
          console.warn(
            'Base UI: The `keepMounted={false}` prop on an `Accordion.Panel` is ignored when ' +
              '`hiddenUntilFound` is enabled on the panel or root, since the panel must remain ' +
              'mounted while closed.',
          );
        }
      },
      {immediate: true},
    );
  }

  // 注册 panel id 到 CollapsibleRoot（卸载时注销）
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    () => registeredId.value,
    (registeredIdValue) => {
      latestRegisteredId.value = registeredIdValue;
      setPanelIdState((currentId: string | null | undefined) =>
        registeredIdValue ?? (currentId === null ? undefined : currentId),
      );
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    setPanelIdState((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.value ? null : currentId,
    );
  });

  const panel = useCollapsiblePanel({
    externalRef: null,
    hiddenUntilFound,
    id,
    keepMounted,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
  });

  const itemContext = useAccordionItemContext();

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const panelState = computed<AccordionPanelState>(() => ({
    ...itemContext.state.value,
    transitionStatus: panel.transitionStatus.value,
  }));

  const panelStyle = computed(() => ({
    [AccordionPanelCssVars.accordionPanelHeight as string]:
      panel.height.value === undefined ? 'auto' : `${panel.height.value}px`,
    [AccordionPanelCssVars.accordionPanelWidth as string]:
      panel.width.value === undefined ? 'auto' : `${panel.width.value}px`,
  }));

  const userStyle = computed(() => {
    const resolved = typeof style?.value === 'function' ? style.value(panelState.value) : style?.value;
    return resolved ? {style: resolved} : undefined;
  });

  const preventOpenStyle = computed(() =>
    panel.shouldPreventOpenAnimation.value ? {style: {animationName: 'none'}} : undefined,
  );

  const rootProps = computed(() =>
    mergePropsN<any>([
      panel.props(),
      {
        'aria-labelledby': itemContext.triggerId.value,
        role: 'region',
        style: panelStyle.value,
      },
      elementProps.value,
      userStyle.value,
      preventOpenStyle.value,
    ]),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {panel.shouldRender.value
        ? useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: panelState.value,
              stateAttributesMapping: accordionStateAttributesMapping,
              ref: panel.ref,
              props: rootProps.value,
            },
          )
        : null}
    </>
  );
}

export interface AccordionPanelState extends AccordionItemState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AccordionPanelProps
  extends
    BaseUIComponentProps<'div', AccordionPanelState>,
    Pick<AccordionRoot.Props, 'hiddenUntilFound' | 'keepMounted'> {}

export namespace AccordionPanel {
  export type State = AccordionPanelState;
  export type Props = AccordionPanelProps;
}
