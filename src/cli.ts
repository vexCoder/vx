#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import _ from "lodash";
import deleteApp from "./process/delete.js";
import generate from "./process/generate.js";
import init from "./process/init.js";
import getSteps from "./steps.js";
import { Commands } from "./types.js";
import {
  getCli,
  getPkg,
  getWorkspaceSettings,
  printParamTable,
} from "./utils.js";

process.on("warning", () => {});

const main = async () => {
  const root = process.cwd();

  const cli = getCli();
  const pkg = getPkg(root);

  const {
    apps,
    workspaces: types,
    templates,
    path,
  } = getWorkspaceSettings(pkg, root);

  const availableInputs = ["generate", "delete", "init"];
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
      type: types[0]?.value,
      deletePath: answers.deletePath,
      generatePath: answers.generatePath,
      ...answers,
      ...args,
    },
    pickKeys[command]
  );

  printParamTable(params);

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
      await generate({
        template,
        type,
        name,
        generatePath,
        tmp: path.templates,
        root,
        apps,
      });
      break;
    }
    case "delete": {
      await deleteApp({ deletePath, apps, name });
      break;
    }
    case "init": {
      await init(path.init);
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
