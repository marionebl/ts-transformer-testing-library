import { transformFile, TransformFileOptions, File } from "./transform-file";
import { transformString } from "./transform-string";

/**
 * @alpha
 */
export function transform(
  input: string | File,
  options: TransformFileOptions
): string {
  if (typeof input === "string") {
    return transformString(input, options);
  }
  return transformFile(input, options);
}
