import { computed, defineComponent } from 'actview';
import { CSPContext, type CSPContextValue } from '@/internals/csp-context/CSPContext';

/**
 * Provides a default Content Security Policy (CSP) configuration for Base UI components that
 * require inline `<style>` or `<script>` tags.
 *
 * Documentation: [Base UI CSP Provider](https://base-ui.com/react/utils/csp-provider)
 */
export const CSPProvider = defineComponent(function (componentProps: CSPProvider.Props) {
  // contextValue 随 props 变化重建（computed 惰性：依赖变化才产生新引用，
  // 官方 Provider 的 value watch-synced 只在引用变化时同步 state）
  const contextValue = computed<CSPContextValue>(() => ({
    nonce: componentProps.nonce,
    disableStyleElements: componentProps.disableStyleElements,
  }));

  // children 在 render 里读（setup 解构会拿到首次渲染的旧 VNode 引用）
  return () => (
    <CSPContext.Provider value={contextValue.value}>{componentProps.children}</CSPContext.Provider>
  );
}) as unknown as (props: CSPProvider.Props) => JSX.Element;

export interface CSPProviderState {}

export interface CSPProviderProps {
  children?: any;
  /**
   * The nonce value to apply to inline `<style>` and `<script>` tags.
   */
  nonce?: string | undefined;
  /**
   * Whether inline `<style>` elements created by Base UI components should not be rendered. Instead, components must specify the CSS styles via custom class names or other methods.
   * @default false
   */
  disableStyleElements?: boolean | undefined;
}

export namespace CSPProvider {
  export type State = CSPProviderState;
  export type Props = CSPProviderProps;
}
