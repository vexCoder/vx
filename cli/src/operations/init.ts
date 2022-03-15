import fs from "fs-extra";
import VError from "verror";
import Operation, { OpSettings } from "./operation.js";
import { Commands } from "../types/index.js";

class InitCommand extends Operation<Commands.init> {
  constructor(cli: OpSettings) {
    super(Commands.init, cli);
  }

  public async verify() {
    const currentDir = process.cwd();
    const files = await fs.readdir(currentDir);
    if (files.length > 0) {
      throw new VError("Current directory is not empty");
    }
  }

  public async prompt() {
    await this.buildPrompt({
      root: process.cwd(),
    });
  }

  async process() {
    console.log(this.values);
  }
}

export default InitCommand;