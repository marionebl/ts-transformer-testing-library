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
    const clone = this.clone();
    clone.mocks.push(moduleDescriptor);
    return clone;
  }

  public addSource(source: File): Transformer {
    const clone = this.clone();

    clone.sources.push(source);
    return clone;
  }

  public addTransformer(transformer: TransformerFn): Transformer {
    const clone = this.clone();

    clone.transformers.push(transformer);
    return clone;
  }

  public addTransformers(transformers: TransformerFn[]): Transformer {
    const clone = this.clone();

    clone.transformers.push(...transformers);
    return clone;
  }

  public setCompilerOptions(options: Ts.CompilerOptions): Transformer {
    const clone = this.clone();

    clone.compilerOptions = options;

    if (clone.project) {
      clone.project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: getCompilerOptions(clone.compilerOptions)
      });
    }

    return clone;
  }

  public setFile(file: File): Transformer {
    const clone = this.clone();

    clone.file = file;
    return clone;
  }

  public setFilePath(filePath: string): Transformer {
    const clone = this.clone();

    clone.filePath = filePath;
    return clone;
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
