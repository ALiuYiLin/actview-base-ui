import { computed, defineComponent } from 'actview';
import { CSPContext, type CSPContextValue } from '../internals/csp-context/CspContext';

/**
 * Provides a default Content Security Policy (CSP) configuration for Base UI components that
 * require inline `<style>` or `<script>` tags.
 *
 * Documentation: [Base UI CSP Provider](https://base-ui.com/react/utils/csp-provider)
 */
export const CSPProvider = defineComponent(function (componentProps: CSPProvider.Props) {
  // ================= setup（只执行一次） =================
  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo，
  // 也保证 Provider watch 只在 nonce/disableStyleElements 真正变化时同步）
  const contextValue = computed<CSPContextValue>(() => ({
    nonce: componentProps.nonce,
    disableStyleElements: componentProps.disableStyleElements,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const { children } = componentProps;

    // Provider 传值不传 ref（案例 5）：value={contextValue.value}，
    // 引用稳定由 computed 惰性缓存保证
    return (
      <CSPContext.Provider value={contextValue.value}>
        {children}
      </CSPContext.Provider>
    );
  };
}) as (props: CSPProvider.Props) => any;

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
