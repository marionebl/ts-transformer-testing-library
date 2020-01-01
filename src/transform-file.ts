import Ts from "typescript";
import * as Path from "path";
import { Project } from "@ts-morph/bootstrap";

/**
 * @alpha
 */
export interface ModuleDescriptor {
  name: string;
  content: string;
}

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
  /* Sources to add to virtual filesystem. */
  sources?: ReadonlyArray<File>;
  /* Mock modules to add to the project context. */
  mocks?: ReadonlyArray<ModuleDescriptor>;
  /* Options to pass to tsc */
  compilerOptions?: Partial<Ts.CompilerOptions>;
  /* TypeScript transform to apply to the compilation */
  transforms: ((program: Ts.Program) => Ts.TransformerFactory<Ts.SourceFile>)[];
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
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
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
      jsx: Ts.JsxEmit.Preserve,
      ...(options.compilerOptions || {})
    }
  });

  project.createSourceFile(file.path, file.contents);

  (options.sources || []).forEach(source =>
    project.createSourceFile(source.path, source.contents)
  );

  (options.mocks || []).forEach(mock => {
    const base = `/node_modules/${mock.name}`;
    project.createSourceFile(`${base}/index.ts`, mock.content);
    project.fileSystem.writeFileSync(
      `${base}/package.json`,
      JSON.stringify({ name: mock.name, main: "./src/index.ts" })
    );
  });

  const program = project.createProgram();

  const { emitSkipped, diagnostics } = program.emit(
    program.getSourceFile(file.path),
    undefined,
    undefined,
    false,
    {
      before: options.transforms.map(t => t(program))
    }
  );

  if (emitSkipped) {
    throw new Error(project.formatDiagnosticsWithColorAndContext(diagnostics));
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

  return String(project.fileSystem.readFileSync(fileArtifactPath));
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
