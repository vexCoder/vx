import meow from "meow";
import { readPackageUpSync } from "read-pkg-up";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import _ from "lodash";
import { table } from "table";
import { ExtraPackageJson } from "./types.js";

export const getWorkspaceApps = (directories: string[]) =>
  directories
    .map((dirs) => {
      let dir = [];
      try {
        dir = fs.readdirSync(dirs);
      } catch (error) {
        fs.mkdirSync(dirs);
        dir = fs.readdirSync(dirs);
      }

      return dir.map((v) => path.join(dirs, v));
    })
    .reduce((p, c) => p.concat(c), [] as string[]);

export const getWorkspaceSettings = (pkg: ExtraPackageJson, root: string) => {
  const directories = (
    pkg.vx?.workspaces ||
    (pkg.workspaces as string[]) ||
    []
  ).map((v) => path.normalize(path.join(root, v)).replace("\\*", ""));

  const workspaces = directories
    .map((v) => v.split("\\").pop())
    .map((v) => ({ value: v, name: v }));

  const appDir = directories.length
    ? getWorkspaceApps(directories)
    : fs
        .readdirSync(root)
        .map((v) => path.normalize(path.join(root, v)))
        .filter((v) => !fs.lstatSync(v).isFile());

  const apps = appDir.map((v) => ({
    value: v,
    name: v.split("\\").pop(),
  }));

  return {
    directories,
    workspaces,
    apps,
  };
};

export const getPkg = (root: string) => {
  const pkg = readPackageUpSync({
    cwd: root,
    normalize: false,
  });

  return pkg.packageJson as ExtraPackageJson;
};

export const getCli = () => {
  const cli = meow(
    `
        Usage
        $ vx <command> [options]
      
        Commands
          generate  Generate a new app
          delete    Remove an app
          
        Options
          --help, -h  Show help
          --version, -v  Show version
          --template, -t  Template to use
          --name, -n  Name of the app
          --type, -t  App type, this is based on the workspace, or vx paths settings
      
      
        Examples
          $ vx generate --template=react-app --name=my-app
        `,
    {
      importMeta: import.meta,
      flags: {
        template: {
          alias: "t",
          type: "string",
        },
        type: {
          type: "string",
        },
        name: {
          alias: "n",
          type: "string",
        },
        noconfirm: {
          type: "boolean",
        },
      },
    }
  );

  return cli;
};

export const printParamTable = (params: Record<any, any>) => {
  const summary = Object.keys(params)
    .sort()
    .filter((v) => !!params[v])
    .map((v) => [
      chalk.green(_.chain(v).capitalize().padEnd(7).value()),
      _.chain(params[v]).padStart(35).value(),
    ]);

  console.log(chalk.green("\nValues:"));
  console.log(
    table(summary, {
      border: {
        topBody: "─",
        topRight: "┐",
        topLeft: "┌",
        bottomLeft: "└",
        bottomRight: "┘",
        bottomBody: "─",
        bodyLeft: "│",
        bodyRight: "│",
        joinBody: "|",
        topJoin: "─",
        bottomJoin: "─",
        bodyJoin: "|",
      },
      singleLine: true,
    })
  );
};
