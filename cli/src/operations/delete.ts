import VError from "verror";
import fs from "fs-extra";
import { join } from "path";
import { globby } from "globby";
import pMap from "p-map";
import rimraf from "rimraf";
import consola from "consola";
import { Commands } from "../types/index.js";
import Operation, { OpSettings } from "./operation.js";
import { getPkg } from "../utils.js";
import { DeleteMapperParams } from "../types/operation.types.js";

class DeleteOperation extends Operation<Commands.delete> {
  constructor(cli: OpSettings) {
    super(Commands.delete, cli);
  }

  public async verify() {
    const { name } = this.cli;

    const appCheckByPath = this.appsWithPath.find((v) => v.path === name);
    const appCheckByName = this.appsWithPath.find((v) => v.name === name);
    if (name && !appCheckByPath && !appCheckByName) {
      throw new VError("App does not exist");
    }

    let npath: string | undefined;
    if (!appCheckByPath && !!appCheckByName) {
      npath = appCheckByName.path;
    }

    if (!(await fs.pathExists(join(npath, ".unlock"))))
      throw new VError("App is locked");

    this.updateValues = {
      path: npath || name,
    };
  }

  public async prompt() {
    if (!this.apps.length) {
      throw new VError("No apps found");
    }

    const answers = await this.buildPrompt({
      apps: this.appsWithPath,
    });

    this.updateCli = {
      name: this.cli.name || answers.app,
    };
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
