import chalk from "chalk";
import Cli from "../../src/cli.js";
import { createTestDir } from "../utils/generator.js";

const main = async () => {
  const { dir } = await createTestDir("manual-test", {
    removeDir: true,
  });

  const cli = new Cli(dir);

  cli.main().catch((err: Error) => {
    console.error(`\n${err.stack?.replace("Error:", chalk.red("Error:"))}`);
  });
};

main();
