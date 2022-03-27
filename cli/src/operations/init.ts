import fs from "fs-extra";
import VError from "verror";
import { basename } from "path";
import pMap from "p-map";
import {
  Commands,
  OpSettings,
  OverrideSettings,
  InitProxy,
  CopyFilesConfig,
} from "../types/index.js";
import Operation from "./operation.js";
import { getInitFiles, getPkg, setPkg } from "../utils.js";

class InitOperation extends Operation<Commands.init> {
  constructor(cli: OpSettings) {
    super(Commands.init, cli);
  }

  public async verify({ path, name: nm }: InitProxy = {}) {
    const currentDir = path ?? this.proxy.path;
    const name = nm ?? this.proxy.name;

    const files = await fs.readdir(currentDir);
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

  public async copyFile(config: CopyFilesConfig) {
    await fs.copy(config.src, config.dest);
  }

  public async getInitFiles(path?: string) {
    if (!path && !this.values.path) throw new Error("Path is not defined");
    const files = await getInitFiles(path ?? this.values.path);
    return files;
  }

  public async writePkg() {
    const pkg = await getPkg(this.values.path);
    if (!pkg) throw new Error("Pkg is not defined");
    await setPkg(this.values.path, {
      name: this.values.name,
    });

    return pkg;
  }

  async process() {
    const files = await this.getInitFiles();
    await pMap(files, this.copyFile, { concurrency: 1 });
    await this.writePkg();
  }
}

export default InitOperation;
