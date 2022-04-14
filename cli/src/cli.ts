import DeleteCommand from "./operations/delete.js";
import GenerateOperation from "./operations/generate.js";
import InitCommand from "./operations/init.js";
import Command from "./operations/operation.js";
import { CliSettings, Commands } from "./types/index.js";
import * as Utils from "./utils.js";

interface Processes {
  generate: typeof GenerateOperation;
  delete: typeof DeleteCommand;
  init: typeof InitCommand;
}

class Cli {
  root: string;
  cli: CliSettings;
  process: Processes = {
    generate: GenerateOperation,
    delete: DeleteCommand,
    init: InitCommand,
  };

  constructor(root?: string) {
    if (root) this.root = root;
  }

  printCommand() {
    const commands = [Commands.generate, Commands.delete, Commands.init];
    const padded = commands.map((v) => `\n    - ${v}`);

    throw new Error(`These are the allowed commands:\n${padded.join("")}`);
  }

  async main(
    args: string[] = []
  ): Promise<Command<Commands.generate | Commands.delete | Commands.init>> {
    this.cli = Utils.getCli(...args);
    if (!Command.isCommand(this.cli.command)) {
      this.printCommand();
    }

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
