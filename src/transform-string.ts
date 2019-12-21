import Ts from "typescript";

export interface TransformStringOptions {
  transform: (args?: any) => Ts.TransformerFactory<Ts.SourceFile>;
}

export const transformString = (
  source: string,
  options: TransformStringOptions
): string => {
  const transformer = options.transform({});
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
