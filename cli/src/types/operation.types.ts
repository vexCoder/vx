export enum Commands {
  generate = "generate",
  delete = "delete",
  init = "init",
}

export type BaseValues<T extends Commands> = {
  command?: T;
};

export interface GenerateValues {
  workspace?: string;
  template?: string;
  destination?: string;
  name?: string;
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

export interface Override {
  useDefault?: boolean;
  disableConfirm?: boolean;
}
