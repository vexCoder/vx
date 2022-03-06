import ejs from "ejs";
import ora from "ora";
import path from "path";
import sp from "cli-spinners";
import fs from "fs-extra";
import { getCurrentFolder } from "../utils.js";

interface InitParams {
  initPath: string;
  author: string;
  email: string;
}

const init = async ({ initPath, author, email }: InitParams) => {
  const { name, path: currentPath } = getCurrentFolder();
  const spinner = ora({
    spinner: sp.dots,
    color: "yellow",
  });

  const nameMatch = /[^a-z_-]/g.test(name || "");
  if (nameMatch || !name || name.length < 3) {
    throw new Error(
      `Name must be lowercase, no spaces, no special characters, and at least 3 characters long`
    );
  }

  console.log("");
  try {
    spinner.start(`Initializing project`);
    let pkg = await fs.readFile(path.join(initPath, "package.json"), "utf8");
    pkg = await ejs.render(pkg, { name, author, email }, { async: true });

    await fs.copy(initPath, currentPath);
    await fs.writeFile(path.join(currentPath, "package.json"), pkg);
    spinner.stop();
    console.log("✔", `Initialized project`);
  } catch (error) {
    console.error("\n", error, "\n");
  }
  console.log("");
};

export default init;
