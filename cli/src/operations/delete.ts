import { join } from "path";
import VError from "verror";
import { Commands } from "../types/index.js";
import Operation, { OpSettings } from "./operation.js";

class DeleteCommand extends Operation<Commands.delete> {
  constructor(cli: OpSettings) {
    super(Commands.delete, cli);
  }

  public async verify() {
    const { name } = this.cli;
    if (!this.apps.includes(name)) {
      throw new VError("App does not exist");
    }

    this.updateValues = {
      path: join(this.root, name),
    };
  }

  public async prompt() {
    const answers = await this.buildPrompt({
      apps: this.apps,
    });

    this.updateCli = {
      name: this.cli.name || answers.app,
    };
  }

  async process() {
    console.log(this.values);
  }
}

export default DeleteCommand;
