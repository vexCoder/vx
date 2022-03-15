import fs from "fs-extra";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const getCurrentPath = () =>
  join(dirname(fileURLToPath(import.meta.url)));

export const makeSampleDir = async () => {
  const path = getCurrentPath();
  const sampleDir = join(path, "sample");
  const sampleDirExists = await fs.pathExists(sampleDir);
  if (!sampleDirExists) {
    await fs.mkdir(sampleDir);
  }

  return sampleDir;
};
