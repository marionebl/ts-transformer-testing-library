import { transformFile, TransformFileOptions, File } from "./transform-file";
import { transformString, TransformStringOptions } from "./transform-string";

export type TransformOptions = TransformStringOptions | TransformFileOptions;

export function transform(input: File, options: TransformFileOptions): string;
export function transform(input: string, options: TransformStringOptions): string;
export function transform(input: string | File, options: TransformOptions): string {
    if (typeof input === "string") {
        return transformString(input, options);
    }
    return transformFile(input, options);
}