import * as Fs from "fs";
import Ts from "typescript";
import { IFs } from "memfs";
import * as Path from "path";
import resolveModule from "resolve";
import {
  copy,
  mkdirp,
  createFile,
  ModuleDescriptor,
  createModule
} from "./memfs";
import { Volume } from "memfs";

export interface File {
  /* Absolute path to file */
  path: string;
  /* Contents of file */
  contents: string;
}

export interface TransformFileOptions {
  /* Filesystem for tsc to work in. Defaults to an empty virtual filesystem. */
  fs?: IFs;
  /* Sources to add to virtual filesystem. */
  sources?: ReadonlyArray<File>;
  /* Mock modules to add to the project context. */
  mocks?: ReadonlyArray<ModuleDescriptor>;
  /* TypeScript transform to apply to the compilation */
  transform: (program: Ts.Program) => Ts.TransformerFactory<Ts.SourceFile>;
}

declare module "resolve" {
  export interface SyncOpts extends resolveModule.Opts {
    /** function to synchronously test whether a directory exists */
    isDirectory?: (directory: string) => boolean;
  }
}

/**
 * Transform a TypeScript file given a project context and transform function
 * in a virtual filesystem
 *
 * @example
 * ```ts
 * const file = {
 *   path: '/index.ts',
 *   contents: `
 *     import { world } from "./world";
 *     console.log("Hello,", world);
 *   `
 * };
 *
 * const sources = [
 *  {
 *    path: '/world.ts',
 *    contents: `export const world = 'World'`
 *  }
 * ];
 *
 * transformFile(file, {
 *   sources,
 *   transform() { ... }
 * })
 * ```
 *
 * @param file File to use as project root
 * @param options Options providing context to the transformation
 */
export const transformFile = (
  file: File,
  options: TransformFileOptions
): string => {
  const fs = options.fs
    ? options.fs
    : ((Volume.fromJSON({}) as unknown) as IFs);
  createFile({ path: file.path, fs }, file.contents);

  (options.sources || []).forEach(source =>
    createFile({ path: source.path, fs }, source.contents)
  );
  (options.mocks || []).forEach(mock => createModule(mock, fs));

  const config: Ts.CompilerOptions = {
    jsx: Ts.JsxEmit.Preserve,
    outDir: "/dist",
    lib: ["/node_modules/typescript/lib/lib.esnext.full.d.ts"],
    module: Ts.ModuleKind.ESNext,
    moduleResolution: Ts.ModuleResolutionKind.NodeJs,
    suppressImplicitAnyIndexErrors: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    target: Ts.ScriptTarget.ESNext,
    types: [],
    noEmitOnError: true
  };

  const compilerHost = Ts.createCompilerHost(config, true);

  copy(
    { fs: Fs, path: compilerHost.getDefaultLibLocation!() },
    { fs, path: "/node_modules/typescript/lib/" }
  );

  compilerHost.getDefaultLibLocation = () => "/node_modules/typescript/lib/";

  compilerHost.fileExists = file => fs.existsSync(file);

  compilerHost.resolveModuleNames = (names, containingFile) => {
    return names.map(name => {
      return {
        resolvedFileName: resolveModule.sync(name, {
          basedir: Path.dirname(containingFile),
          extensions: [".js", ".json", ".node", ".tsx", ".ts", ".d.ts"],
          readFileSync: path => fs.readFileSync(path),
          isFile: (name: string) => {
            try {
              return fs.statSync(name).isFile();
            } catch (err) {
              return false;
            }
          },
          isDirectory: (name: string) => {
            try {
              return fs.statSync(name).isDirectory();
            } catch (err) {
              return false;
            }
          }
        })
      };
    });
  };

  compilerHost.getSourceFile = (filename, version) => {
    return Ts.createSourceFile(
      filename,
      String(fs.readFileSync(Path.join("/", `${filename}`))),
      version
    );
  };

  compilerHost.writeFile = (filename, data) => {
    mkdirp({ fs, path: Path.dirname(filename) });
    fs.writeFileSync(filename, data);
  };

  const program = Ts.createProgram([file.path], config, compilerHost);

  const { emitSkipped, diagnostics, emittedFiles } = program.emit(
    program.getSourceFile(file.path),
    undefined,
    undefined,
    false,
    {
      before: [options.transform(program)]
    }
  );

  if (emitSkipped || typeof emittedFiles === 'undefined') {
    throw new Error(
      diagnostics.map(diagnostic => diagnostic.messageText).join("\n")
    );
  }

  return String(fs.readFileSync(emittedFiles[0]!));
};
