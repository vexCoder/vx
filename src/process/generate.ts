import path from "path";
import sp from "cli-spinners";
import fs from "fs-extra";
import ora from "ora";
import ejs from "ejs";

interface GenerateParams {
  tmp: string;
  template: string;
  generatePath?: string;
  type: string;
  name?: string;
  root: string;
  apps: { name: string; value: string }[];
}

const generate = async ({
  template,
  type,
  name,
  tmp,
  root,
  apps,
}: GenerateParams) => {
  const find = apps.find((v) => v.name === name);
  if (find) {
    throw new Error(`App ${find.name} already exists`);
  }

  const templatePath = path.join(tmp, template);
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
    spinner.start(`Generating ${template} in ${type}/${name}`);
    let pkg = await fs.readFile(
      path.join(templatePath, "package.json"),
      "utf8"
    );
    pkg = await ejs.render(pkg, { name }, { async: true });

    const outputPath = path.join(root, type, name);
    await fs.copy(templatePath, outputPath);
    await fs.writeFile(path.join(outputPath, "package.json"), pkg);
    spinner.stop();
    console.log("✔", `Generated ${template} in ${type}/${name}`);
  } catch (error) {
    console.error("\n", error, "\n");
  }
  console.log("");
};

export default generate;
