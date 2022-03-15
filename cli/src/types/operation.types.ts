import { CliSettings } from "./cli.types.js";

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
  isRoot: boolean;
}

export interface DeleteValues {
  path?: string;
}

export type Values<T extends Commands> = T extends Commands.generate
  ? GenerateValues
  : T extends Commands.delete
  ? DeleteValues
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
