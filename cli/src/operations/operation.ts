import _ from "lodash";
import {
  CliSettings,
  Commands,
  Override,
  VerifiedValues,
} from "../types/index.js";
import {
  getTemplateList,
  getWorkspaceApps,
  getWorkspaceList,
} from "../utils.js";
import getSteps from "./steps.js";

export interface OpSettings extends CliSettings {
  override?: Override;
  root?: string;
}

abstract class Operation<T extends Commands> {
  public root: string;
  public cli: CliSettings;
  public values: VerifiedValues<T> = {} as VerifiedValues<T>;
  public override: Override = {};

  get templates() {
    return getTemplateList();
  }

  get defaultTemplate() {
    return _.first(this.templates);
  }

  get appsWithPath() {
    return getWorkspaceApps();
  }

  get apps() {
    return getWorkspaceApps().map((v) => v.name);
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
    const { override, ...cli } = settings;

    this.cli = cli;
    this.override = override || {};
    this.override.disableConfirm =
      override?.disableConfirm || !this.cli.confirm;
    this.values.command = command;
    if (settings.root) this.root = settings.root;
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
