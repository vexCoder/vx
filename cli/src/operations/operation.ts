import _ from "lodash";
import { dirname } from "path";
import {
  CliSettings,
  Commands,
  Settings,
  OpSettings,
  VerifiedValues,
} from "../types/index.js";
import {
  getTemplateList,
  getWorkspaceApps,
  getWorkspaceList,
} from "../utils.js";
import getSteps from "./steps.js";

abstract class Operation<T extends Commands> {
  public root: string;
  public cli: CliSettings;
  public values: VerifiedValues<T> = {} as VerifiedValues<T>;
  public override: Settings = {};

  get templates() {
    return getTemplateList();
  }

  get defaultTemplate() {
    return _.first(this.templates);
  }

  get appsWithPath() {
    return getWorkspaceApps(this.root);
  }

  get apps() {
    return getWorkspaceApps(this.root).map((v) => v.name);
  }

  get defaultApp() {
    return _.first(this.apps);
  }

  get workspaces() {
    return getWorkspaceList(this.root);
  }

  get defaultWorkspace() {
    return _.first(this.workspaces);
  }

  get buildPrompt() {
    const step = getSteps({
      cli: this.cli,
      disableConfirm: this.override?.disableConfirm || this.cli.confirm,
      useDefault: this.override?.useDefault,
    });

    return step[this.values.command] as typeof step[T];
  }

  set updateValues(partial: Partial<VerifiedValues<T>>) {
    this.values = {
      ...this.values,
      ...partial,
    };
  }

  set updateCli(partial: Partial<CliSettings>) {
    this.cli = {
      ...this.cli,
      ...partial,
    };
  }

  public abstract process(): Promise<void>;
  public abstract verify(): void;
  public abstract prompt(): void;

  constructor(command: T, settings: OpSettings) {
    const { useDefault, disableConfirm, root, ...cli } = settings;

    this.cli = cli;
    this.override = {};
    this.override.disableConfirm = disableConfirm || !this.cli.confirm;
    this.override.useDefault = useDefault;
    this.values.command = command;
    if (root) this.root = dirname(root);
  }

  static isCommand(command: string): command is Commands {
    const allowedCommands: Commands[] = [
      Commands.generate,
      Commands.delete,
      Commands.init,
    ];

    return allowedCommands.includes(command as Commands);
  }
}

export default Operation;
