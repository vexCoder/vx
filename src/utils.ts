import meow from "meow";
import { readPackageUpSync } from "read-pkg-up";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import _ from "lodash";
import { table } from "table";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
    pkg?.vx?.workspaces ||
    (pkg?.workspaces as string[]) ||
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

  const templatesPath = path.join(
    dirname(fileURLToPath(import.meta.url)),
    "templates"
  );

  const templates = fs.readdirSync(templatesPath);

  const init = path.join(dirname(fileURLToPath(import.meta.url)), "init");

  return {
    directories,
    workspaces,
    apps,
    templates,
    path: {
      init,
      templates: templatesPath,
    },
  };
};

export const getPkg = (root: string) => {
  const pkg = readPackageUpSync({
    cwd: root,
    normalize: false,
  });

  return pkg?.packageJson as ExtraPackageJson;
};

export const getCli = () => {
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
          --noconfirm, Disable confirmation
      
      
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

  if (!summary.length) return;

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

export const getCurrentFolder = () => {
  const rootPath = path.resolve(process.cwd());
  return {
    path: rootPath,
    name: path.basename(rootPath),
  };
};
