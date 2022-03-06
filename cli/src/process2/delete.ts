import path from "path";
import sp from "cli-spinners";
import fs from "fs-extra";
import ora from "ora";

interface GenerateParams {
  deletePath?: string;
  name?: string;
  apps: { name: string; value: string }[];
}

const deleteApp = async ({ apps, deletePath: d, name: n }: GenerateParams) => {
  const find = apps.find((v) => v.name === n || v.value === d);
  if (!find) {
    throw new Error(`App ${find.name} does not exist`);
  }

  const deletePath = d || find.value;
  const name = n || deletePath.split("\\").pop();
  const unlockPath = path.join(deletePath, ".unlock");
  const spinner = ora({
    spinner: sp.dots,
    color: "yellow",
  });

  try {
    await fs.access(unlockPath);
  } catch (error) {
    console.log("\n", "You need to unlock the project first", "\n");
    return;
  }

  console.log("");
  try {
    spinner.start(`Deleting ${name} in ${deletePath}`);
    await fs.remove(deletePath);
    spinner.stop();
    console.log("✔", `Deleted ${name} in ${deletePath}`);
  } catch (error) {
    console.error("\n", error, "\n");
  }
  console.log("");
};

export default deleteApp;
