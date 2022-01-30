import findit from "findit2";
import minimatch from "minimatch";
import fs from "fs-extra";
import { join } from "path";
import { PackageJson, readPackageUp } from "read-pkg-up";

type ExtraPackageJson = PackageJson & {
  vx?: {
    paths?: string[];
  };
};

export const getPkg = async (root: string) => {
  const pkg = await readPackageUp({
    cwd: root,
    normalize: false,
  });

  const json: ExtraPackageJson = pkg.packageJson as ExtraPackageJson;
  return json;
};

export const deleteFilePattern = async (path: string, ...args: string[]) => {
  const paths = await new Promise<string[]>((resolve) => {
    const temp = [];
    const finder = findit(path);
    finder.on("path", (file: string) => {
      if (path === file) return;

      const check = [];
      for (let i = 0; i < args.length; i += 1) {
        const pattern = args[i];
        check.push(minimatch(file, pattern, { matchBase: true }));
      }

      if (check.reduce((p, c) => p && c, true)) temp.push(file);
    });

    finder.on("end", () => {
      resolve(temp);
    });
  });

  await Promise.all(
    paths.map(async (file) => {
      await fs.remove(file);
    })
  );
};

export const deleteAllInFolder = async (deletePath: string) => {
  const paths = await fs.readdir(deletePath);

  await Promise.all(
    paths.map(async (file) => {
      await fs.remove(join(deletePath, file));
    })
  );
};

export const checkDirforFileOrDir = async (path: string, ...args: string[]) => {
  const paths = [];
  await new Promise<void>((resolve) => {
    const finder = findit(path);
    finder.on("path", (p: string) => {
      if (path === p) return;
      const name = p.split("\\").pop();

      const check = [];
      for (let i = 0; i < args.length; i += 1) {
        const filename = args[i];
        check.push(filename === name);
      }

      if (check.reduce((prev, c) => prev || c, false)) paths.push(name);
    });

    finder.on("end", () => {
      resolve();
    });
  });

  return paths.length === args.length;
};
