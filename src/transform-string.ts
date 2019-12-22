import Ts from "typescript";

/**
 * @alpha
 */
export interface TransformStringOptions {
  /* TypeScript transform to apply to the compilation */
  transform: (args?: any) => Ts.TransformerFactory<Ts.SourceFile>;
  /* Options to pass to tsc */
  compilerOptions?: Partial<Ts.CompilerOptions>;
}

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
  options: TransformStringOptions
): string => {
  const program = Ts.createProgram({
    rootNames: ["index.ts"],
    options: {
      module: Ts.ModuleKind.ESNext,
      moduleResolution: Ts.ModuleResolutionKind.NodeJs,
      ...(options.compilerOptions ? options.compilerOptions : {})
    }
  });

  const transformer = options.transform(program);

  const sourceFile = Ts.createSourceFile(
    "index.ts",
    source,
    Ts.ScriptTarget.Latest,
    true
  );

  const actual = Ts.transform(sourceFile, [transformer]).transformed[0];
  return Ts.createPrinter()
    .printFile(actual)
    .toString();
};
