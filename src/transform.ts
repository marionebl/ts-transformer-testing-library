import { transformFile, TransformFileOptions, File } from "./transform-file";
import { transformString, TransformStringOptions } from "./transform-string";

/**
 * @alpha
 */
export type TransformOptions = TransformStringOptions | TransformFileOptions;


/**
 * @alpha
 */
export function transform(input: File, options: TransformFileOptions): string;
/**
 * @alpha
 */
export function transform(input: string, options: TransformStringOptions): string;
/**
 * @alpha
 */
export function transform(input: string | File, options: TransformOptions): string {
    if (typeof input === "string") {
        return transformString(input, options);
    }
    return transformFile(input, options);
}