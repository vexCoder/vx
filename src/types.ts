import { PackageJson } from "read-pkg-up";

export type ExtraPackageJson = PackageJson & {
  vx?: {
    workspaces?: string[];
  };
};
