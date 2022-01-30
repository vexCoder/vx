import inquirer from "inquirer";
import { PackageJson } from "read-pkg-up";

export type ExtraPackageJson = PackageJson & {
  vx?: {
    workspaces?: string[];
  };
};

export type Commands = "generate" | "delete" | "init";

export interface Steps {
  generate: inquirer.QuestionCollection;
  delete: inquirer.QuestionCollection;
}
