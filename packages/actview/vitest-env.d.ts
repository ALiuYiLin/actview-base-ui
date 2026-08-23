declare const process: {
  env: {
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
};

declare module '*.css?scoped' {
  const css: string;
  export default css;
}