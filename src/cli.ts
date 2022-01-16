#!/usr/bin/env node

import meow from "meow";
import path from "path";
import inquirer from "inquirer";
import fs from "fs-extra";
import chalk from "chalk";
import { table } from "table";
import _ from "lodash";
import { PackageJson, readPackageUp } from "read-pkg-up";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import generate from "./process/generate.js";
import getSteps, { Commands } from "./steps.js";
import deleteApp from "./process/delete.js";

process.on("warning", () => {});

type ExtraPackageJson = PackageJson & {
  vx?: {
    workspaces?: string[];
  };
};

const main = async () => {
  const cli = meow(
    `
  Usage
  $ vx <command> [options]

  Commands
    generate  Generate a new project
    delete    Remove a project
    
  Options
    --help, -h  Show help
    --version, -v  Show version
    --template, -t  Template to use
    --name, -n  Name of the project
    --type, -t  Project workspace


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

  const root = process.cwd();
  const pkg = await readPackageUp({
    cwd: root,
    normalize: false,
  });

  const json: ExtraPackageJson = pkg.packageJson as ExtraPackageJson;
  const workspaces = (
    json.vx?.workspaces ||
    (json.workspaces as string[]) ||
    []
  ).map((v) => path.normalize(path.join(root, v)).replace("\\*", ""));

  const directories = (
    await Promise.all<string[]>(
      workspaces.map(async (workspace) => {
        let dir = [];
        try {
          dir = await fs.readdir(workspace);
        } catch (error) {
          await fs.mkdir(workspace);
          dir = await fs.readdir(workspace);
        }

        return dir.map((v) => path.join(workspace, v));
      })
    )
  ).reduce((p, c) => p.concat(c), []);

  const templatesPath = path.join(
    dirname(fileURLToPath(import.meta.url)),
    "templates"
  );
  const templates = await fs.readdir(templatesPath);

  const availableInputs = ["generate", "delete"];
  const pickKeys = {
    generate: ["template", "name", "type"],
    delete: ["name"],
  };
  const command = cli.input[0] as Commands;

  if (!command || !availableInputs.includes(command)) {
    return;
  }

  console.log(
    `\n ${cli.pkg.name}-cli ${cli.pkg.version} ${chalk.green(command)} \n`
  );

  const { flags } = cli;
  const { noconfirm, norun, ...args } = flags;

  const types = workspaces
    .map((v) => v.split("\\").pop())
    .map((v) => ({ value: v, name: v }));

  const apps = directories.map((v) => ({
    value: v,
    name: v.split("\\").pop(),
  }));

  const steps = getSteps({
    templates,
    command,
    types,
    apps,
    defaults: {
      template: flags.template,
      type: flags.type,
      deleting: flags.name,
      name: flags.name,
    },
  });

  const answers = await inquirer.prompt(steps || []);
  const params = _.pick(
    {
      template: templates[0],
      type: types[0]?.value || ".",
      deletePath: answers.deletePath,
      generatePath: answers.generatePath,
      ...answers,
      ...args,
    },
    pickKeys[command]
  );

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

  if (!noconfirm) {
    const confirm = await inquirer.prompt([
      {
        type: "confirm",
        message: "Is this correct?",
        name: "confirm",
        default: false,
      },
    ]);

    if (!confirm.confirm) {
      throw new Error(`Aborted`);
    }
  }

  const { template, type, name, deletePath, generatePath } = params;

  switch (command) {
    case "generate": {
      if (!types.find((v) => v.value === type)) {
        throw new Error(`Workspace ${type} not found`);
      }

      await generate({
        template,
        type,
        name,
        generatePath,
        tmp: templatesPath,
        root,
        apps,
      });
      break;
    }
    case "delete": {
      await deleteApp({ deletePath, apps, name });
      break;
    }
    default:
      break;
  }
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(`\n${err.stack?.replace("Error:", chalk.red("Error:"))}`);
  });
