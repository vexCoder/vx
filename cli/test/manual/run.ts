import chalk from "chalk";
import Cli from "../../src/cli.js";
import { createTestDir } from "../utils/generator.js";

const main = async () => {
  const { dir } = await createTestDir("manual-test");

  const cli = new Cli(dir);

  cli
    .main()
    .then(() => process.exit(0))
    .catch((err: Error) => {
      console.error(`\n${err.stack?.replace("Error:", chalk.red("Error:"))}`);
    });
};

main();
