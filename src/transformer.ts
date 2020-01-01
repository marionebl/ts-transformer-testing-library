import Ts from "typescript";
import { ModuleDescriptor, File, transformFile, getCompilerOptions } from "./transform-file";
import { Project } from "@ts-morph/bootstrap";

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
  private project?: Project;

  private clone() {
    const target = new Transformer();

    for (const prop in this) {
      if (this.hasOwnProperty(prop)) {
        (target as any)[prop] = this[prop];
      }
    }

    return target;
  }

  public addMock(moduleDescriptor: ModuleDescriptor): Transformer {
    this.mocks.push(moduleDescriptor);
    return this.clone();
  }

  public addSource(source: File): Transformer {
    this.sources.push(source);
    return this;
  }

  public addTransformer(transformer: TransformerFn): Transformer {
    this.transformers.push(transformer);
    return this;
  }

  public addTransformers(transformers: TransformerFn[]): Transformer {
    this.transformers.push(...transformers);
    return this;
  }

  public setCompilerOptions(options: Ts.CompilerOptions): Transformer {
    this.compilerOptions = options;

    if (this.project) {
      this.project.compilerOptions.set(options);
    }

    return this;
  }

  public setFile(file: File): Transformer {
    this.file = file;
    return this;
  }

  public setFilePath(filePath: string): Transformer {
    this.filePath = filePath;
    return this;
  }

  public transform(input?: string): string {
    this.project = this.project || new Project({
      useInMemoryFileSystem: true,
      compilerOptions: getCompilerOptions(this.compilerOptions)
    });

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
      project: this.project,
      compilerOptions: this.compilerOptions,
      mocks: this.mocks,
      sources: this.sources,
      transforms: this.transformers
    });
  }
}
