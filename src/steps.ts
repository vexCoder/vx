import inquirer from "inquirer";

export type Commands = "generate" | "delete";

export interface Steps {
  generate: inquirer.QuestionCollection;
  delete: inquirer.QuestionCollection;
}

interface Options {
  command: Commands;
  types: { name: string; value: string }[];
  apps: { name: string; value: string }[];
  templates: string[];
  defaults?: {
    template?: string;
    type?: string;
    name?: string;
    deleting?: string;
  };
}

const getSteps = ({
  types,
  apps,
  templates,
  command,
  defaults,
}: Options): inquirer.QuestionCollection => {
  const config: Record<
    Commands,
    Record<string, inquirer.QuestionCollection & { name: string }>
  > = {
    generate: {
      template: {
        name: "template",
        message: "Select what to generate:",
        choices: templates.map((v) => ({
          name: v,
          value: v,
        })),
        type: "list",
        default: () => defaults?.template,
      },
      ...(types.length && {
        type: {
          name: "type",
          message: "Which path to add?",
          type: "list",
          choices: types,
          default: () => defaults?.type,
        },
      }),
      name: {
        name: "name",
        message: "What is the name of your package?",
        type: "input",
        default: () => defaults?.name,
      },
    },
    delete: {
      deleting: {
        name: "deletePath",
        message: "What to remove?",
        choices: apps,
        type: "list",
      },
    },
  };

  const steps = config[command];
  const defaultKeys = Object.keys(defaults).filter((key) => !!defaults[key]);

  return Object.keys(steps)
    .filter((v) => !defaultKeys.includes(v))
    .map((v) => steps[v]);
};

export default getSteps;
