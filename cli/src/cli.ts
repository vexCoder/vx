import VError from "verror";
import Command from "./operations/operation.js";
import DeleteCommand from "./operations/delete.js";
import GenerateCommand from "./operations/generate.js";
import InitCommand from "./operations/init.js";
import * as Utils from "./utils.js";
import { CliSettings } from "./types/index.js";

interface Processes {
  generate: typeof GenerateCommand;
  delete: typeof DeleteCommand;
  init: typeof InitCommand;
}

class Cli {
  root: string;
  cli: CliSettings;
  process: Processes = {
    generate: GenerateCommand,
    delete: DeleteCommand,
    init: InitCommand,
  };

  constructor(root?: string) {
    if (root) this.root = root;
  }

  async main(args?: string[]) {
    this.cli = Utils.getCli(args);
    if (!Command.isCommand(this.cli.command))
      throw new VError("Invalid command");

    const operation = new this.process[this.cli.command]({
      ...this.cli,
      root: this.root,
    });

    await operation.prompt();
    await operation.verify();
    await operation.process();

    return operation;
  }
}

export default Cli;
