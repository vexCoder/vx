import fs from "fs-extra";
import _ from "lodash";
import { join } from "path";
import { PackageJson } from "type-fest";
import DeleteOperation from "../../src/operations/delete.js";
import GenerateOperation from "../../src/operations/generate.js";
import { getCli } from "../../src/utils.js";
import { getTestDir } from "./utils.js";
import InitOperation from "../../src/operations/init.js";
import { VXPackageJSON } from "../../src/types/utils.types.js";

interface CreateTestDirOptions {
  removeDir?: boolean;
  removePkg?: boolean;
  pkg?: VXPackageJSON;
}

export type CreateTestDirValue = {
  dir: string;
  pkg: () => Promise<PackageJson>;
  delete: () => Promise<void>;
  name: string;
};

export const createTestDir = async (
  name: string,
  options?: CreateTestDirOptions
): Promise<CreateTestDirValue> => {
  const path = getTestDir();
  const testDir = join(path, name);
  const testDirExists = await fs.pathExists(testDir);
  if (testDirExists && options?.removeDir) {
    await fs.remove(testDir);
  }

  await fs.mkdirp(testDir);

  const pkgPath = join(testDir, "package.json");
  if (!options?.removePkg && options?.removeDir) {
    await fs.writeJSON(pkgPath, {
      name,
      workspaces: ["packages/*"],
      ...(options?.pkg || []),
    } as PackageJson);
  }

  return {
    dir: testDir,
    pkg: async () => {
      return (await fs.readJSON(pkgPath)) as PackageJson;
    },
    delete: async () => {
      await fs.remove(testDir);
    },
    name,
  };
};

const convertObjectToParams = <T extends {}>(obj: T) => {
  return Object.entries(obj).map(([k, v]) => `--${k}=${v}`);
};

export interface DeleteOpParams {
  root?: string;
  name?: string;
  useDefault?: boolean;
}

export const testDelete = (options: DeleteOpParams = {}) => {
  const params = _.omit(options, ["root"]);
  const cli = getCli("delete", ...convertObjectToParams(params));
  const op = new DeleteOperation({
    ...cli,
    root: options.root,
    useDefault: options.useDefault ?? true,
  });

  return op;
};

export interface GenerateOpParams {
  root?: string;
  name?: string;
  template?: string;
  workspace?: string;
  useDefault?: boolean;
}

export const testGenerate = (options: GenerateOpParams = {}) => {
  const params = _.omit(options, ["root"]);
  const cli = getCli("generate", ...convertObjectToParams(params));
  const op = new GenerateOperation({
    ...cli,
    root: options.root,
    useDefault: options.useDefault ?? true,
    confirm: false,
  });

  return op;
};

export interface InitOpParams {
  root?: string;
  useDefault?: boolean;
  disableConfirm?: boolean;
}

export const testInit = (options: InitOpParams = {}) => {
  const params = _.omit(options, ["root"]);
  const cli = getCli("generate", ...convertObjectToParams(params));
  const op = new InitOperation({
    ...cli,
    root: options.root,
    useDefault: options.useDefault ?? true,
    disableConfirm: options.disableConfirm ?? true,
  });

  return op;
};

export const getPkg = async (path: string) => {
  const pkgPath = join(path, "package.json");
  if (!(await fs.pathExists(pkgPath))) return {};
  return (await fs.readJSON(pkgPath)) as PackageJson;
};

export const createPkg = async (path: string, pkg: Partial<PackageJson>) => {
  const json = await getPkg(path);

  await fs.writeJSON(join(path, "package.json"), {
    ...json,
    ...pkg,
  });

  return path;
};

export const unlockApp = async (path: string) => {
  await fs.writeFile(join(path, ".unlock"), "");
};

export const createApp = async (
  name: string,
  path: string,
  options: PackageJson = {}
) => {
  const appPath = join(path, name);
  await fs.mkdirp(appPath);
  await createPkg(appPath, {
    name,
    ...options,
  });
  return appPath;
};

export const createUnlockedApp = async (
  name: string,
  path: string,
  options: PackageJson = {}
) => {
  const appPath = await createApp(name, path, options);
  await unlockApp(appPath);
  return appPath;
};

export const createEmptyFolder = async (name: string, path: string) => {
  const appPath = join(path, name);
  await fs.mkdirp(appPath);
  await unlockApp(appPath);
  return appPath;
};
