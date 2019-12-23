import Ts from "typescript";
import { transformFile, TransformFileOptions } from "./transform-file";

/**
 * Transform a standalone TypeScript source string.
 * This will only work for sources and transformers that do not use 
 * external files or work with modules
 *
 * @example
 * ```ts
 * transform(`console.log('Hello, World')`, {
 *   transform() { ... }
 * })
 * ```
 * 
 * @alpha
 * @param source - String to transpile and transform
 * @param options - Additional options for transpilation
 */
export const transformString = (
  source: string,
  options: TransformFileOptions
): string => {
  return transformFile({
    path: "/index.ts",
    contents: source
  }, options);
};
