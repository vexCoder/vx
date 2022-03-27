import consola from "consola";
import fs from "fs-extra";
import { globby } from "globby";
import pMap from "p-map";
import { join } from "path";
import rimraf from "rimraf";
import VError from "verror";
import {
  Commands,
  DeleteMapperParams,
  DeleteProxy,
  OpSettings,
  OverrideSettings,
} from "../types/index.js";
import { getPkg } from "../utils.js";
import Operation from "./operation.js";

class DeleteOperation extends Operation<Commands.delete> {
  constructor(cli: OpSettings) {
    super(Commands.delete, cli);
  }

  private async isUnlock(p?: string) {
    return fs.pathExists(join(p ?? this.values.path, ".unlock"));
  }

  public async verify(options?: DeleteProxy) {
    const path = options?.path ?? this.tmp.path;
    const name = options?.name ?? this.tmp.name;

    if (!path || !(await fs.pathExists(path || "."))) {
      throw new VError("Invalid path");
    }

    const app = this.appsWithPath.find((v) => v.path === path);
    const pkg = await getPkg(app?.path);
    if (!name || !app?.path || !pkg || pkg?.name !== name) {
      throw new VError("App is invalid");
    }

    if (!(await this.isUnlock(path))) {
      throw new VError("App is locked");
    }

    const files = await this.getFiles();
    if (
      files.length &&
      !files.filter((v) => v.path.indexOf(path) === 0).length
    ) {
      throw new VError("Files are not in app");
    }

    this.values.path = path;
  }

  public async prompt(cli?: OverrideSettings) {
    if (!this.appsWithPath.length) {
      throw new VError("No apps found");
    }

    const answers = await this.buildPrompt({
      apps: this.appsWithPath,
    });

    const name = cli?.name ?? this.cli.name ?? answers.app;
    const findApp = this.appsWithPath.find((v) => v.name === name);

    this.tmp.path = findApp?.path;
    this.tmp.name = findApp?.name;
  }

  async checkApp() {
    const checkPath =
      (await fs.pathExists(this.values.path)) &&
      (await fs.pathExists(join(this.values.path, "package.json")));

    const pkg = await getPkg(this.values.path);

    if (!checkPath) throw new Error("App does not exist");
    if (this.cli.name.indexOf(pkg.name) === -1)
      throw new Error("App does not exist");
  }

  async getFiles() {
    const paths = (
      await globby(["./**/*"], {
        cwd: this.values.path,
        dot: true,
        absolute: true,
        objectMode: true,
      })
    ).map((v) => ({ name: v.name, path: v.path }));

    return paths;
  }

  async deleteMapper(file: DeleteMapperParams) {
    const result = await new Promise<DeleteMapperParams>((resolve, reject) => {
      rimraf(file.path, (err) => {
        if (err) reject(err);
        else {
          resolve(file);
          consola.info(`${file.name} deleted`);
        }
      });
    });

    return result;
  }

  async deleteFiles() {
    const paths = await this.getFiles();
    const deleted = await pMap(paths, this.deleteMapper, {
      concurrency: this.cli.concurrency,
    });

    return deleted;
  }

  async process() {
    await this.checkApp();
    await this.deleteFiles();
  }
}

export default DeleteOperation;
