import { createApp } from 'actview';
import { App } from './App';

// createApp 接收根组件（函数组件由 actviewPlugin 转换为 {__setup}）；
// 顶层 JSX（如 <App /> 需传入组件本身）由 vite esbuild 按
// jsxImportSource: @actview/jsx 编译。
const container = document.querySelector('#app');
if (!container) {
  throw new Error('找不到 #app 容器');
}

createApp(App).mount('#app');
