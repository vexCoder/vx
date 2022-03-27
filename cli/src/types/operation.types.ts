export interface CliSettings {
  command: string | Commands;
  template?: string;
  name?: string;
  workspace?: string;
  confirm?: boolean;
  concurrency?: number;
}

export type OverrideSettings = Omit<CliSettings, "command">;

export enum Commands {
  generate = "generate",
  delete = "delete",
  init = "init",
}

export type BaseValues<T extends Commands> = {
  command?: T;
};

export interface GenerateValues {
  workspace: string;
  template: string;
  destination: string;
  name: string;
}

export interface GenerateProxy {
  workspace?: string;
  template?: string;
  destination?: string;
  name?: string;
  isRoot?: boolean;
}

export interface DeleteValues {
  path: string;
}
export interface DeleteProxy {
  path?: string;
  name?: string;
}

export interface InitValues {
  path: string;
}
export interface InitProxy {
  path?: string;
}

export type Proxy<T extends Commands> = T extends Commands.generate
  ? GenerateProxy
  : T extends Commands.delete
  ? DeleteProxy
  : T extends Commands.init
  ? InitProxy
  : object;

export type Values<T extends Commands> = T extends Commands.generate
  ? GenerateValues
  : T extends Commands.delete
  ? DeleteValues
  : T extends Commands.init
  ? InitValues
  : object;

export type VerifiedValues<T extends Commands> = BaseValues<T> & Values<T>;

export interface Settings {
  useDefault?: boolean;
  disableConfirm?: boolean;
}

export interface DeleteMapperParams {
  name: string;
  path: string;
}

export interface OpSettings extends CliSettings, Settings {
  root?: string;
}
