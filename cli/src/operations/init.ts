import fs from "fs-extra";
import VError from "verror";
import { basename } from "path";
import pMap from "p-map";
import {
  Commands,
  OpSettings,
  OverrideSettings,
  InitProxy,
  FileConfig,
} from "../types/index.js";
import Operation from "./operation.js";
import { getInitFiles, getPkg, setPkg } from "../utils.js";
import { render, task, TaskManagerApi } from "../task/taskManager.js";

class InitOperation extends Operation<Commands.init> {
  constructor(cli: OpSettings) {
    super(Commands.init, cli);
  }

  public async verify({ path, name: nm }: InitProxy = {}) {
    const currentDir = path ?? this.proxy.path;
    const name = nm ?? this.proxy.name;

    const files = await fs.readdir(currentDir);
    console.log(currentDir);
    if (files.length > 0) {
      throw new VError("Current directory is not empty");
    }

    this.values.path = currentDir;
    this.values.name = name;
  }

  public async prompt({ root = process.cwd() }: OverrideSettings = {}) {
    await this.buildPrompt({
      root,
    });

    this.proxy.path = root;
    this.proxy.name = basename(root);
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
    const pipeline = task("Generating base", ({ task }) => {
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
