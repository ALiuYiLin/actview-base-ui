export { default as createDescribe } from './createDescribe';
export { flushMicrotasks } from './flushMicrotasks';
export { randomStringValue } from './randomStringValue';
export { screen } from './screen';

/**
 * 编译期类型断言（对齐 React 版 #test-utils）：`expectType<T, typeof v>(v)`
 * 在 T 与 U 不兼容时报类型错误。
 */
export function expectType<T, U>(_value: U): T extends U ? true : never {
  return true as any;
}
