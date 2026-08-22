import type { StateAttributesMapping } from '../internals/getStateAttributesProps';

// 属性名对齐 React collapsible 契约：
//   CollapsiblePanelDataAttributes.open    = 'data-open'
//   CollapsiblePanelDataAttributes.closed  = 'data-closed'
//   CollapsibleTriggerDataAttributes.panelOpen = 'data-panel-open'
// actview 的 collapsible 家族迁移后，应改用其 DataAttributes 枚举。
const PANEL_OPEN_HOOK = { 'data-open': '' };

const PANEL_CLOSED_HOOK = { 'data-closed': '' };

export const triggerOpenStateMapping: StateAttributesMapping<{
  open: boolean;
}> = {
  open(value) {
    if (value) {
      return {
        'data-panel-open': '',
      };
    }
    return null;
  },
};

export const collapsibleOpenStateMapping = {
  open(value) {
    if (value) {
      return PANEL_OPEN_HOOK;
    }
    return PANEL_CLOSED_HOOK;
  },
} satisfies StateAttributesMapping<{
  open: boolean;
}>;
