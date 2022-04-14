#!/usr/bin/env node

import chalk from "chalk";
import Cli from "./cli.js";

const cli = new Cli();

cli.main().catch((err: Error) => {
  console.error(`\n${err.stack?.replace("Error:", chalk.red("Error:"))}`);
});
