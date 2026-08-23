export function inertValue(value?: boolean): boolean | undefined {
  // actview 无 React 版本差异——统一返回 boolean（React 19 语义）
  return value ? true : undefined;
}
