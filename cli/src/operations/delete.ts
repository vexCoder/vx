import fs from "fs-extra";
import pMap from "p-map";
import { join } from "path";
import rimraf from "rimraf";
import { render, task, TaskManagerApi } from "../task/taskManager.js";
import {
  Commands,
  DeleteMapperParams,
  DeleteProxy,
  OpSettings,
  OverrideSettings,
} from "../types/index.js";
import { directoryTraversal, getPkg } from "../utils.js";
import Operation from "./operation.js";

class DeleteOperation extends Operation<Commands.delete> {
  constructor(cli: OpSettings) {
    super(Commands.delete, cli);
  }

  private async isUnlock(p?: string) {
    return fs.pathExists(join(p ?? this.values.path, ".unlock"));
  }

  public async verify(options?: DeleteProxy) {
    const path = options?.path ?? this.proxy.path;
    const name = options?.name ?? this.proxy.name;

    if (!path || !(await fs.pathExists(path || "."))) {
      throw new Error("Invalid path");
    }

    const app = this.appsWithPath.find((v) => v.path === path);
    const pkg = await getPkg(app?.path);
    if (!name || !app?.path || !pkg || pkg?.name !== name) {
      throw new Error("App is invalid");
    }

    if (!(await this.isUnlock(path))) {
      throw new Error("App is locked");
    }

    const files = await this.getFiles(path);
    if (
      files.length &&
      !files.filter((v) => v.path.indexOf(path) === 0).length
    ) {
      throw new Error("Files are not in app");
    }

    this.values.name = name;
    this.values.path = path;
  }

  public async prompt(override?: OverrideSettings) {
    if (!this.appsWithPath.length) {
      throw new Error("No apps found");
    }

    const answers = await this.buildPrompt({
      apps: this.appsWithPath,
    });

    if (!answers.confirm && this.cli.confirm)
      throw new Error("App deletion cancelled");

    const name = override?.name ?? this.cli.name ?? answers.app;
    const findApp = this.appsWithPath.find((v) => v.name === name);

    this.proxy.path = findApp?.path;
    this.proxy.name = findApp?.name;
  }

  async getFiles(path?: string) {
    const paths = await directoryTraversal(
      path ?? this.values.path,
      ["./**/*"],
      async (v, dir) => ({
        name: v,
        path: join(dir, v),
      })
    );

    return paths;
  }

  async deleteFile(file: DeleteMapperParams) {
    const result = await new Promise<DeleteMapperParams>((resolve, reject) => {
      rimraf(file.path, (err) => {
        if (err) reject(err);
        else {
          resolve(file);
        }
      });
    });

    return result;
  }

  async checkApp(t?: TaskManagerApi) {
    t.setStatus("loading");
    const checkPath =
      (await fs.pathExists(this.values.path)) &&
      (await fs.pathExists(join(this.values.path, "package.json")));

    const pkg = await getPkg(this.values.path);

    if (!checkPath) throw new Error("App does not exist");
    if (this.values.name.indexOf(pkg.name) === -1)
      throw new Error("App does not exist");
    t.setStatus("success");
  }

  async deleteFiles(t?: TaskManagerApi) {
    t.setStatus("loading");
    const paths = await this.getFiles();
    const deleted = await pMap(
      paths,
      async (v, i) => {
        t.setMessage(`Deleting: ${v.name}`);
        t.setProgress((i + 1) / paths.length);
        return await this.deleteFile(v);
      },
      {
        concurrency: this.cli.concurrency,
      }
    );

    t.setStatus("success");
    return deleted;
  }

  process = async () => {
    const pipeline = task("Deleting files", ({ task }) => {
      task("Checking Dir", async (t) => {
        await this.checkApp(t);
      });

      task("Deleting", async (t) => {
        await this.deleteFiles(t);
        await fs.rmdir(this.values.path);
      });
    });

    await render([pipeline]);
  };
}

export default DeleteOperation;
