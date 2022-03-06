import fs from "fs-extra";
import _ from "lodash";
import meow from "meow";
import { dirname, join, normalize } from "path";
import VError from "verror";
import { fileURLToPath } from "url";
import fg from "fast-glob";
import { CliSettings } from "./types/index.js";

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

export const getWorkspaceList = (r?: string) => {
  const root = getProjectRoot(r);
  const pkg = fs.readJSONSync(join(root, "package.json"));
  if (pkg.workspaces) {
    const workspaces: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages;
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

export const getWorkspaceApps = (workspace?: string) => {
  const workspaces = getWorkspaceList();

  if (workspace && workspaces.includes(workspace)) {
    return fs.readdirSync(join(getProjectRoot(), workspace));
  }
  if (!workspace) {
    return workspaces.reduce(
      (p, c) => [...p, ...fs.readdirSync(join(getProjectRoot(), c))],
      [] as string[]
    );
  }

  return [];
};

export const directoryTraversal = async (
  path: string,
  destination: string,
  matcher: string[] = []
) => {
  interface CopyFilesConfig {
    src: string;
    dest: string;
    isDir: boolean;
  }

  console.log(matcher);
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
