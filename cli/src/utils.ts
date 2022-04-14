import fg, { Options } from "fast-glob";
import fs from "fs-extra";
import _ from "lodash";
import meow from "meow";
import pMap from "p-map";
import { dirname, join, normalize } from "path";
import { PackageJson } from "type-fest";
import { fileURLToPath } from "url";
import { CliSettings, SpinnerOptions, VXPackageJSON } from "./types/index.js";

export const setRoot = (path?: string) => {
  const newRoot = path ? normalize(path) : process.cwd();
  const doesPathExists = fs.pathExistsSync(newRoot);

  if (doesPathExists) {
    if (path) process.chdir(newRoot);

    return process.cwd();
  }
  throw new Error("Invalid path");
};

export const getPkg = (path?: string) => {
  if (!path) return;
  const pkgPath = join(path, "package.json");
  if (!fs.pathExistsSync(pkgPath)) return;
  const pkg = fs.readJSONSync(pkgPath);
  return pkg as VXPackageJSON;
};

export const setPkg = (path?: string, values: Partial<PackageJson> = {}) => {
  if (!path) return;
  let pkg = getPkg(path) ?? {};
  fs.writeJSONSync(
    join(path, "package.json"),
    {
      ...pkg,
      ...values,
    },
    { spaces: 2 }
  );

  pkg = getPkg(path);
  if (!pkg) return;
  return pkg as PackageJson;
};

export const getProjectRoot = (r?: string) => {
  let root = "";
  let tmp = r ?? process.cwd();

  while (root !== tmp) {
    const pkg = getPkg(tmp);

    if (pkg && pkg.workspaces) {
      root = tmp;
      break;
    } else {
      const ntmp = join(tmp, "..");
      if (tmp === ntmp) {
        throw new Error("Could not find project root");
      }

      tmp = ntmp;
    }
  }

  return root;
};

export const getCliRoot = () =>
  join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const getCli = (...argv: string[]): CliSettings => {
  const cli = meow(
    `
        Usage
        $ vx <command> [options]
      
        Commands
          generate  Generate a new app
          delete    Remove an app
          init      Initialize vex-turbo-boilerplate files
          
        Options
          --help, -h  Show help
          --version, -v  Show version
          --template, -t  Template to use
          --name, -n  Name of the app
          --type, -t  App type, this is based on the workspace, or vx paths settings
          --no-confirm, Disable confirmation
          --dir Change the current working directory

          init config: 
          --author, -a  Author of the project
          --email, -e  Author email
      
      
        Examples
          $ vx generate --template=react-app --name=my-app
          $ vx init --author=John
        `,
    {
      importMeta: import.meta,
      ...(!!argv.length && { argv }),
      flags: {
        template: {
          alias: "t",
          type: "string",
        },
        name: {
          alias: "n",
          type: "string",
        },
        workspace: {
          alias: "w",
          type: "string",
        },
        confirm: {
          type: "boolean",
          default: true,
        },
        concurrency: {
          type: "number",
          default: Infinity,
        },
      },
    }
  );

  return {
    command: cli.input[0],
    ...cli.flags,
  };
};

export const getTemplateList = (r?: string) => {
  const projectRoot = getProjectRoot(r);
  const pkg = getPkg(projectRoot);
  const root = getCliRoot();

  const map = _.curry((path: string, name: string) => ({
    value: join(path, name),
    name,
  }));

  let templates = fs.readdirSync(join(root, "templates")).map(map(root));
  let additional = [];
  const vxtemplates = pkg?.vx?.templatesPaths ?? [];
  if (vxtemplates && Array.isArray(vxtemplates) && vxtemplates.length) {
    for (let i = 0; i < vxtemplates.length; i++) {
      const dir = vxtemplates[i];
      const templatesPath = join(projectRoot, dir);
      const list = fs.readdirSync(templatesPath).map(map(templatesPath));
      additional = additional.concat(list);
    }
  }

  if (additional.length) templates = templates.concat(additional);

  return templates;
};

export const getPkgWorkspace = (r?: string) => {
  const root = getProjectRoot(r);
  const pkg = getPkg(root);

  const w = pkg.vx?.workspaces ?? pkg.workspaces;
  const workspaces: string[] = Array.isArray(w) ? w : w.packages;

  return workspaces || [];
};

export const getWorkspaceList = (r?: string) => {
  const workspaces = getPkgWorkspace(r);
  if (workspaces.length) {
    const sanitizedWorkspaces = workspaces.reduce((p, c) => {
      const pathSplitArray = c.split("/");
      if (pathSplitArray.length > 1 && _.last(pathSplitArray) === "*") {
        pathSplitArray.pop();
        return [...p, pathSplitArray.join("/")];
      }
      return p;
    }, [] as string[]);

    return sanitizedWorkspaces;
  }

  return [];
};

interface GetAllDirectoryWithPkgOptions {
  path: string;
  name: string;
}

export const getAllDirectoryWithPkg = (r?: string) => {
  const root = r || getProjectRoot();
  const reduce: GetAllDirectoryWithPkgOptions[] = fs
    .readdirSync(root)
    .reduce((p, c) => {
      const path = join(root, c);
      const isDirectory = fs.lstatSync(path).isDirectory();
      const blacklist = ["node_modules", ".git"];

      if (isDirectory && !blacklist.includes(c)) {
        const pkg = getPkg(path);
        const readPath = getAllDirectoryWithPkg(path);
        if (pkg) return [...p, ...readPath, { path, name: c }];
        return [...p, ...readPath];
      }

      return p;
    }, [] as GetAllDirectoryWithPkgOptions[]);

  return reduce;
};

export const getWorkspaceApps = (nroot?: string, workspace?: string) => {
  const root = normalize(nroot ?? getProjectRoot());
  const pkgWorkspaces = getPkgWorkspace(root);
  const workspaces = getWorkspaceList(root);

  if (workspace && workspaces.includes(workspace)) {
    return fs.readdirSync(join(root, workspace)).map((v) => ({
      name: v,
      path: join(root, workspace, v),
    }));
  }

  if (!workspace) {
    const possibleApps = pkgWorkspaces
      .filter((v) => !v.includes("/*"))
      .map((v) => ({
        path: join(root, v),
        name: v,
      }));

    const apps = workspaces
      .map((o) => {
        const workspacePath = join(root, o);
        if (!fs.pathExistsSync(workspacePath)) return [];
        return fs.readdirSync(workspacePath).map((v) => ({
          path: join(workspacePath, v),
          name: v,
        }));
      })
      .reduce((p, c) => [...p, ...c], [] as { path: string; name: string }[])
      .concat(possibleApps);

    const dirWithPkg = getAllDirectoryWithPkg(root);
    const validApps = dirWithPkg.filter(
      (v) =>
        !!apps.find((o) => o.path === v.path) &&
        !!apps.find((o) => o.path.includes(root))
    );

    return validApps;
  }

  return [];
};

export const directoryTraversal = async <T = string>(
  path: string,
  matcher: string[],
  callback?: (file: string, dir: string) => Promise<T>,
  settings?: Options,
  reverse?: boolean
) => {
  const files = await fg(reverse ? ["**/*"] : matcher, {
    cwd: path,
    dot: true,
    onlyFiles: false,
    markDirectories: true,
    ...(reverse && { ignore: matcher }),
    ...settings,
  });

  const filesToCopy: (T | string)[] = await Promise.all(
    files.map(async (v) => callback?.(v, path) ?? v)
  );

  return filesToCopy as typeof callback extends undefined ? string[] : T[];
};

export const getInitFiles = async (destination: string) => {
  const root = join(getCliRoot(), "init");
  const files = await directoryTraversal(
    root,
    ["**/*", "!**/node_modules/**"],
    async (v, dir) => ({
      src: join(dir, v),
      dest: join(destination, v),
      isDir: (await fs.stat(join(dir, v))).isDirectory(),
      name: v,
    })
  );

  return files;
};

export const iterableLoader = async <T, Z>(
  p: Iterable<T>,
  settings: SpinnerOptions<T, Z>
) => {
  const { messager, ...opts } = settings;

  const mapWrapper = (params: T): Promise<Z> => {
    if (messager) messager(params);
    return settings.map(params);
  };

  const res = (await pMap(p, mapWrapper, { concurrency: 1, ...opts })) as Z[];

  return res;
};
