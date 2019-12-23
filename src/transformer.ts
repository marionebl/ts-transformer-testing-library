import Ts from "typescript";
import { ModuleDescriptor, File, transformFile } from "./transform-file";

export type TransformerFn = (
  program: Ts.Program
) => Ts.TransformerFactory<Ts.SourceFile>;

export class Transformer {
  private compilerOptions: Ts.CompilerOptions = {};
  private filePath?: string;
  private file?: File;
  private mocks: ModuleDescriptor[] = [];
  private sources: File[] = [];
  private transformers: TransformerFn[] = [];

  public addMock(moduleDescriptor: ModuleDescriptor): this {
    this.mocks.push(moduleDescriptor);
    return this;
  }

  public addSource(source: File): this {
    this.sources.push(source);
    return this;
  }

  public addTransformer(transformer: TransformerFn): this {
    this.transformers.push(transformer);
    return this;
  }

  public addTransformers(transformers: TransformerFn[]): this {
    this.transformers.push(...transformers);
    return this;
  }

  public setCompilerOptions(options: Ts.CompilerOptions): this {
    this.compilerOptions = options;
    return this;
  }

  public setFile(file: File): this {
    this.file = file;
    return this;
  }

  public setFilePath(filePath: string): this {
    this.filePath = filePath;
    return this;
  }

  public transform(input?: string) {
    const filePath = typeof this.filePath === "string"
      ? this.filePath
      : "/index.ts";

    const file = typeof input === "string"
      ? { path: filePath, contents: input }
      : this.file;

    if (!file) {
      throw new Error(`transform must be called on Transformer with file or with string input`);
    }

    return transformFile(file, {
      compilerOptions: this.compilerOptions,
      mocks: this.mocks,
      sources: this.sources,
      transforms: this.transformers
    });
  }
}
