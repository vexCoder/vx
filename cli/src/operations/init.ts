import fs from "fs-extra";
import pMap from "p-map";
import { basename } from "path";
import { render, task, TaskManagerApi } from "../task/taskManager.js";
import {
  Commands,
  FileConfig,
  InitProxy,
  OpSettings,
  OverrideSettings,
} from "../types/index.js";
import { getInitFiles, getPkg, setPkg } from "../utils.js";
import Operation from "./operation.js";

class InitOperation extends Operation<Commands.init> {
  constructor(cli: OpSettings) {
    super(Commands.init, cli);
  }

  public async verify({ path, name: nm }: InitProxy = {}) {
    const currentDir = path ?? this.proxy.path;
    const name = nm ?? this.proxy.name;

    const files = await fs.readdir(currentDir);
    if (files.length > 0) {
      throw new Error("Current directory is not empty");
    }

    this.values.path = currentDir;
    this.values.name = name;
  }

  public async prompt({ root }: OverrideSettings = {}) {
    const nroot = root ?? this.root ?? process.cwd();
    const answers = await this.buildPrompt({
      root: nroot,
    });

    if (!answers.confirm && this.cli.confirm)
      throw new Error("Project creation cancelled");

    this.proxy.path = nroot;
    this.proxy.name = this.cli.name ?? basename(nroot);
  }

  public async copyFile(config: FileConfig) {
    await fs.copy(config.src, config.dest);
  }

  public async getInitFiles(path?: string) {
    if (!path && !this.values.path) throw new Error("Path is not defined");
    const files = await getInitFiles(path ?? this.values.path);
    return files;
  }

  writePkg = async (t: TaskManagerApi) => {
    const pkg = await getPkg(this.values.path);
    if (!pkg) throw new Error("Pkg is not defined");
    await setPkg(this.values.path, {
      name: this.values.name,
    });

    t.setStatus("success");
    return pkg;
  };

  copyFiles = async (t: TaskManagerApi) => {
    t.setStatus("loading");
    const files = await this.getInitFiles();
    await pMap(
      files,
      async (v, i) => {
        t.setMessage(`Copying: ${v.name}`);
        t.setProgress((i + 1) / files.length);
        return await this.copyFile(v);
      },
      { concurrency: 1 }
    );
    t.setStatus("success");
  };

  async process() {
    const pipeline = task("Generating base", ({ task, setDescription }) => {
      setDescription(`Path: ${this.values.path}`);
      task("Copying Files", async (t) => {
        await this.copyFiles(t);
      });

      task("Setting up", async (t) => {
        await this.writePkg(t);
      });
    });

    await render([pipeline]);
  }
}

export default InitOperation;
