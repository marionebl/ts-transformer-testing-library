import * as Fs from "fs";
import * as Path from "path";
import { IFs } from "memfs";

export type FsLike = IFs | typeof Fs;

export interface FsOrigin {
  fs: FsLike;
  path: string;
}

/**
 * @alpha
 */
export interface ModuleDescriptor {
  name: string;
  content: string;
}

export function mkdirp(at: FsOrigin): void {
  const fragments = at.path.split("/");

  fragments
    .map((_, index) => fragments.slice(0, index + 1).join("/"))
    .filter(Boolean)
    .filter(p => !at.fs.existsSync(p))
    .forEach(path => at.fs.mkdirSync(path));
}

export function copy(from: FsOrigin, to: FsOrigin): void {
  list(from.path, from.fs).forEach(subPath => {
    const sourcePath = Path.resolve(from.path, subPath);
    const targetPath = Path.resolve(to.path, subPath);
    mkdirp({ fs: to.fs, path: Path.dirname(targetPath) });
    to.fs.writeFileSync(targetPath, from.fs.readFileSync(sourcePath));
  });
}

export function createFile(at: FsOrigin, contents: string): void {
  mkdirp({ path: Path.dirname(at.path), fs: at.fs });
  at.fs.writeFileSync(at.path, contents);
}

export function createModule(mod: ModuleDescriptor, fs: FsLike): void {
  mkdirp({ path: `/node_modules/${mod.name}`, fs });

  const base = `/node_modules/${mod.name}`;
  createFile({ path: `${base}/index.ts`, fs }, mod.content);
  createFile({ path: `${base}/package.json`, fs }, JSON.stringify({ name: mod.name, main: './src/index.ts' }));
}

export function list(dir: string, fs: FsLike, basedir?: string): string[] {
  const base = typeof basedir === "string" ? basedir : dir;

  return (fs
    .readdirSync(dir, {  encoding: 'buffer' }) as string[])
    .map((subPath: string) => {
      const p = Path.resolve(dir, String(subPath));
      const stat = fs.statSync(p);

      if (stat.isDirectory()) {
        return list(p, fs, base);
      } else {
        return [Path.relative(base, p)];
      }
    })
    .reduce((acc, ps) => [...acc, ...ps], []);
}
