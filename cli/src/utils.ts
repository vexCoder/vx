import fs from "fs-extra";
import _ from "lodash";
import meow from "meow";
import { dirname, join, normalize } from "path";
import VError from "verror";
import { fileURLToPath } from "url";
import fg from "fast-glob";
import { PackageJson } from "type-fest";
import { CliSettings } from "./types/index.js";
import { CopyFilesConfig } from "./types/utils.types.js";

export const setRoot = (path?: string) => {
  const newRoot = path ? normalize(path) : process.cwd();
  const doesPathExists = fs.pathExistsSync(newRoot);

  if (doesPathExists) {
    if (path) process.chdir(newRoot);

    return process.cwd();
  }
  throw new VError("Invalid path");
};

export const getProjectRoot = (r?: string) => {
  let root = "";
  let tmp = r || process.cwd();

  while (root !== tmp) {
    const doesPathExist = fs.pathExistsSync(join(tmp, "package.json"));
    const { workspaces } = fs.readJSONSync(join(tmp, "package.json"));

    if (doesPathExist && workspaces) {
      root = tmp;
      break;
    } else {
      tmp = join(tmp, "..");
    }
  }

  return root;
};

export const getCliRoot = () =>
  join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const getCli = (argv?: string[]): CliSettings => {
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
      ...(!!argv && { argv }),
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

export const getTemplateList = () => {
  const root = getCliRoot();
  const templates = fs.readdirSync(join(root, "templates"));

  return templates;
};

export const getPkg = (path: string) => {
  const pkgPath = join(path, "package.json");
  if (!fs.pathExistsSync(pkgPath)) return;
  const pkg = fs.readJSONSync(pkgPath);
  return pkg as PackageJson;
};

export const getPkgWorkspace = (r?: string) => {
  const root = getProjectRoot(r);
  const pkg = getPkg(root);

  const workspaces: string[] = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces.packages;

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
  const pkgWorkspaces = getPkgWorkspace(nroot);
  const workspaces = getWorkspaceList(nroot);
  const root = nroot || getProjectRoot();

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
      (v) => !!apps.find((o) => o.path === v.path)
    );

    return validApps;
  }

  return [];
};

export const directoryTraversal = async (
  path: string,
  destination: string,
  matcher: string[] = []
) => {
  const files = await fg(matcher, {
    cwd: path,
    dot: true,
    onlyFiles: false,
    markDirectories: true,
  });

  const filesToCopy: CopyFilesConfig[] = await Promise.all(
    files.map(async (v) => ({
      src: join(path, v),
      dest: join(destination, v),
      isDir: (await fs.stat(join(path, v))).isDirectory(),
    }))
  );

  return filesToCopy;
};
