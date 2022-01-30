import ejs from "ejs";
import ora from "ora";
import path from "path";
import sp from "cli-spinners";
import fs from "fs-extra";
import { getCurrentFolder } from "../utils.js";

const init = async (initPath: string) => {
  const { name, path: currentPath } = getCurrentFolder();
  const spinner = ora({
    spinner: sp.dots,
    color: "yellow",
  });
  console.log(name, currentPath);

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
    pkg = await ejs.render(pkg, { name }, { async: true });

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