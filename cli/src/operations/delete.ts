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
  DeleteValues,
  OpSettings,
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

  public async verify(options?: DeleteValues) {
    const path = options?.path ?? this.tmp.path;

    if (!(await fs.pathExists(path))) {
      throw new VError("Path does not exist");
    }

    const app = this.appsWithPath.find((v) => v.path === path);
    if ((path && !app) || !app.path) {
      throw new VError("App does not exist");
    }

    const pkg = await getPkg(app.path);
    if (!pkg || (pkg && pkg.name !== this.tmp.name) || !this.tmp.name) {
      throw new VError("Directory is not an app");
    }

    if (!(await this.isUnlock(path))) {
      throw new VError("App is locked");
    }

    this.values.path = path;
  }

  public async prompt() {
    if (!this.appsWithPath.length) {
      throw new VError("No apps found");
    }

    const answers = await this.buildPrompt({
      apps: this.appsWithPath,
    });

    const name = this.cli.name ?? answers.app;

    const findApp = this.appsWithPath.find((v) => v.name === name);

    this.tmp.path = findApp?.path;
    this.tmp.name = name;
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
