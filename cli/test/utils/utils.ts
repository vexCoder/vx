import fs from "fs-extra";
import { dirname, join } from "path";
import { PackageJson } from "type-fest";
import { fileURLToPath } from "url";

export const getCurrentPath = () =>
  join(dirname(fileURLToPath(import.meta.url)));

export const getCliRoot = () =>
  join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const getTestDir = () => join(getCliRoot(), ".test");

export const makeSampleDir = async () => {
  const path = getCurrentPath();
  const sampleDir = join(path, "sample");
  const sampleDirExists = await fs.pathExists(sampleDir);
  if (!sampleDirExists) {
    await fs.mkdir(sampleDir);
  }

  return sampleDir;
};

export const readPkg = async (dir: string) => {
  return fs.readJSON(dir) as PackageJson;
};

export const getTemplates = async () => {
  return (await fs.readdir(join(getCliRoot(), "..", "templates"))).map((v) => ({
    name: v,
    dir: join(getCliRoot(), "..", "templates", v),
  }));
};
