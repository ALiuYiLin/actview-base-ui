import { TransitionStatusDataAttributes } from '@/internals/stateAttributesMapping';

export enum AccordionRootDataAttributes {
  /**
   * Present when the accordion is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Indicates the orientation of the accordion.
   */
  orientation = 'data-orientation',
}

export enum AccordionItemDataAttributes {
  /**
   * Indicates the index of the accordion item.
   * @type {number}
   */
  index = 'data-index',
  /**
   * Present when the accordion item is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the accordion item is open.
   */
  open = 'data-open',
}

export enum AccordionHeaderDataAttributes {
  /**
   * Indicates the index of the accordion item.
   * @type {number}
   */
  index = 'data-index',
  /**
   * Present when the accordion item is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the accordion item is open.
   */
  open = 'data-open',
}

export enum AccordionTriggerDataAttributes {
  /**
   * Present when the accordion panel is open.
   */
  panelOpen = 'data-panel-open',
  /**
   * Present when the accordion item is disabled.
   */
  disabled = 'data-disabled',
}

export enum AccordionPanelDataAttributes {
  /**
   * Indicates the index of the accordion item.
   * @type {number}
   */
  index = 'data-index',
  /**
   * Present when the accordion panel is open.
   */
  open = 'data-open',
  /**
   * Indicates the orientation of the accordion.
   */
  orientation = 'data-orientation',
  /**
   * Present when the accordion item is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the panel begins animating in.
   */
  startingStyle = TransitionStatusDataAttributes.startingStyle,
  /**
   * Present when the panel is animating out.
   */
  endingStyle = TransitionStatusDataAttributes.endingStyle,
}

export enum AccordionPanelCssVars {
  /**
   * The accordion panel's height.
   * @type {number}
   */
  accordionPanelHeight = '--accordion-panel-height',
  /**
   * The accordion panel's width.
   * @type {number}
   */
  accordionPanelWidth = '--accordion-panel-width',
}
