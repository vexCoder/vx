import Inquirer from "inquirer";
import _ from "lodash";
import { CliSettings, Commands } from "../types/index.js";

interface StepFactoryParams {
  cli: CliSettings;
  useDefault: boolean;
  disableConfirm: boolean;
}

interface GenerateParams {
  templates: { name: string; value: string }[];
  workspaces: string[];
}
export interface GenerateAnswers {
  template: string;
  workspace: string;
  name: string;
  confirm?: boolean;
}

interface DeleteParams {
  apps: {
    name: string;
    path: string;
  }[];
}

export interface DeleteAnswers {
  app: string;
  confirm?: boolean;
}

interface InitParams {
  root: string;
}

export interface InitAnswers {
  confirm?: boolean;
}

const generateProcessSteps = (
  p: StepFactoryParams,
  gp: GenerateParams
): Inquirer.QuestionCollection<GenerateAnswers> => [
  {
    type: "list",
    name: "template",
    message: "Select a template",
    choices: gp.templates.sort(),
    when: !p.useDefault && !p.cli.template,
  },
  {
    type: "list",
    name: "workspace",
    message: "Select which workspace to use",
    choices: gp.workspaces.sort(),
    when: !p.useDefault && !p.cli.workspace,
  },
  {
    type: "input",
    name: "name",
    message: "Input the name of the app",
    when: !p.useDefault && !p.cli.name,
  },
  {
    type: "confirm",
    name: "confirm",
    message: (a) =>
      `Are you sure you want to create an app named ${
        a.name || p.cli.name
      } in ${a.workspace || p.cli.workspace}?`,
    when: !p.useDefault && !p.disableConfirm,
  },
];

const deleteProcessSteps = (
  p: StepFactoryParams,
  dp: DeleteParams
): Inquirer.QuestionCollection<DeleteAnswers> => [
  {
    type: "list",
    name: "app",
    message: "Select which app to delete",
    choices: dp.apps.sort(),
    when: !p.useDefault && !p.cli.name,
  },
  {
    name: "confirm",
    type: "confirm",
    message: (a) => `Are you sure you want to delete ${a.app || p.cli.name}?`,
    when: !p.useDefault && !p.disableConfirm,
  },
];

const initProcessSteps = (
  p: StepFactoryParams,
  ip: InitParams
): Inquirer.QuestionCollection<InitAnswers> => [
  {
    name: "confirm",
    type: "confirm",
    message: `Are you sure you want initialize a new project in ${ip.root}?`,
    when: !p.useDefault && !p.disableConfirm,
  },
];

type StepFactoryCallback = (
  p: StepFactoryParams,
  p2: GenerateParams | DeleteParams | InitParams
) => Inquirer.QuestionCollection;

type InferQuestionCollection<T> = T extends Inquirer.QuestionCollection<infer R>
  ? R
  : T;

export interface StepFactory<T extends StepFactoryCallback> {
  (params: Parameters<T>[1]): Promise<InferQuestionCollection<ReturnType<T>>>;
}

const getSteps = (params: StepFactoryParams) => {
  function stepsFactory<T extends StepFactoryCallback>(cb: T): StepFactory<T> {
    const curriedSteps = _.curry(cb)(params);

    return async (p: Parameters<T>[1]) => {
      const steps = curriedSteps(p);
      const answers = await Inquirer.prompt<
        InferQuestionCollection<ReturnType<T>>
      >(steps);
      return answers;
    };
  }

  return {
    [Commands.generate]: stepsFactory(generateProcessSteps),
    [Commands.delete]: stepsFactory(deleteProcessSteps),
    [Commands.init]: stepsFactory(initProcessSteps),
  };
};

export default getSteps;
