import * as Fs from "fs";
import Ts from "typescript";
import { IFs } from "memfs";
import * as Path from "path";
import resolve from "resolve";
import {
  copy,
  mkdirp,
  createFile,
  ModuleDescriptor,
  createModule
} from "./memfs";
import { Volume } from "memfs";

export { ModuleDescriptor };

/**
 * @alpha
 */
export interface File {
  /* Absolute path to file */
  path: string;
  /* Contents of file */
  contents: string;
}

/**
 * @alpha
 */
export interface TransformFileOptions {
  /* Filesystem for tsc to work in. Defaults to an empty virtual filesystem. */
  fs?: IFs;
  /* Sources to add to virtual filesystem. */
  sources?: ReadonlyArray<File>;
  /* Mock modules to add to the project context. */
  mocks?: ReadonlyArray<ModuleDescriptor>;
  /* Options to pass to tsc */
  compilerOptions?: Partial<Ts.CompilerOptions>;
  /* TypeScript transform to apply to the compilation */
  transform: (program: Ts.Program) => Ts.TransformerFactory<Ts.SourceFile>;
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
 * @alpha
 * @param file - File to use as project root
 * @param options - Options providing context to the transformation
 */
export const transformFile = (
  file: File,
  options: TransformFileOptions
): string => {
  const fs = options.fs
    ? options.fs
    : ((Volume.fromJSON({}) as unknown) as IFs);

  const readFileSync = (path: string) => fs.readFileSync(path);

  const isFile = (name: string) => {
    try {
      return fs.statSync(name).isFile();
    } catch (err) {
      return false;
    }
  };

  const isDirectory = (name: string) => {
    try {
      return fs.statSync(name).isDirectory();
    } catch (err) {
      return false;
    }
  };

  const resolveFileName = (name: string, containingFile: string): string => {
    return resolve.sync(name, {
      basedir: Path.dirname(containingFile),
      extensions: [".js", ".json", ".node", ".tsx", ".ts", ".d.ts"],
      readFileSync,
      isFile,
      isDirectory
    });
  };

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
    noEmitOnError: true,
    ...(options.compilerOptions || {})
  };

  const compilerHost = Ts.createCompilerHost(config, true);

  copy(
    { fs: Fs, path: compilerHost.getDefaultLibLocation!() },
    { fs, path: "/node_modules/typescript/lib/" }
  );

  compilerHost.getDefaultLibLocation = () => "/node_modules/typescript/lib/";

  compilerHost.fileExists = file => fs.existsSync(file);

  compilerHost.resolveModuleNames = (names, containingFile) => {
    return names.map(name => ({
      resolvedFileName: resolveFileName(name, containingFile)
    }));
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

  const { emitSkipped, diagnostics } = program.emit(
    program.getSourceFile(file.path),
    undefined,
    undefined,
    false,
    {
      before: [options.transform(program)]
    }
  );

  if (emitSkipped) {
    throw new Error(
      diagnostics.map(diagnostic => diagnostic.messageText).join("\n")
    );
  }

  const inFile = program.getSourceFile(file.path);

  if (!inFile) {
    throw new Error(`Could not get SourceFile for ${file.path}`);
  }

  if (!inFile) {
    throw new Error(`Could not determine ArtifactFile for ${file.path}`);
  }

  const fileArtifactPath = getFileArtifactPath(inFile, program);

  if (!fileArtifactPath) {
    throw new Error(`Could not determine fileArtifactPath for ${file.path}`);
  }

  return String(fs.readFileSync(fileArtifactPath));
};

function getFileArtifactPath(
  file: Ts.SourceFile,
  program: Ts.Program
): string | undefined {
  const options = program.getCompilerOptions();
  const extname = Path.extname(file.fileName);
  const basename = Path.basename(file.fileName, extname);

  const artifactExtname =
    extname === ".tsx" && options.jsx === Ts.JsxEmit.Preserve ? ".jsx" : ".js";

  return Path.join(options.outDir || ".", `${basename}${artifactExtname}`);
}
