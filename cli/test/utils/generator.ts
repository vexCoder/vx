import fs from "fs-extra";
import _ from "lodash";
import { join } from "path";
import { PackageJson } from "type-fest";
import DeleteOperation from "../../src/operations/delete.js";
import GenerateOperation from "../../src/operations/generate.js";
import { getCli } from "../../src/utils.js";
import { getCliRoot } from "./utils.js";

interface CreateTestDirOptions {
  removeDir?: boolean;
  pkg?: PackageJson;
}

export type CreateTestDirValue = {
  dir: string;
  pkg: () => Promise<PackageJson>;
  delete: () => Promise<void>;
};

export const createTestDir = async (
  name: string,
  options?: CreateTestDirOptions
): Promise<CreateTestDirValue> => {
  const path = getCliRoot();
  const testDir = join(path, name);
  const testDirExists = await fs.pathExists(testDir);
  if (testDirExists && options?.removeDir) {
    await fs.remove(testDir);
  } else if (testDirExists) {
    throw new Error("Directory already exists");
  }

  await fs.mkdir(testDir);

  const pkgPath = join(testDir, "package.json");
  await fs.writeJSON(pkgPath, {
    name,
    workspaces: ["packages/*"],
    ...options.pkg,
  } as PackageJson);

  return {
    dir: testDir,
    pkg: async () => {
      return (await fs.readJSON(pkgPath)) as PackageJson;
    },
    delete: async () => {
      await fs.remove(testDir);
    },
  };
};

const convertObjectToParams = <T extends {}>(obj: T) => {
  return Object.entries(obj).map(([k, v]) => `--${k}=${v}`);
};

interface DeleteOpParams {
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

interface GenerateOpParams {
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
  });

  return op;
};
