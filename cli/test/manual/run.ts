import chalk from "chalk";
import fs from "fs-extra";
import Cli from "../../src/cli.js";
import { createApp, createTestDir } from "../utils/generator.js";

// Add more options here
const main = async () => {
  const { dir } = await createTestDir("manual-test", {
    removeDir: true,
    pkg: {
      vx: {
        templatesPaths: ["./test-templates"],
      },
    },
  });

  await createApp("test-template-app", ".test/manual-test/test-templates", {});
  await fs.writeFile(
    ".test/manual-test/test-templates/test-template-app/test-file.txt",
    "test",
    "utf8"
  );

  await fs.writeFile(
    ".test/manual-test/test-templates/test-template-app/.vxignore",
    "**/test-file.txt"
  );

  const cli = new Cli(dir);

  cli.main().catch((err: Error) => {
    console.error(`\n${err.stack?.replace("Error:", chalk.red("Error:"))}`);
  });
};

main();
