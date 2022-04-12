/* eslint-disable @typescript-eslint/no-shadow */
import fs from "fs-extra";
import pMap, * as PMap from "p-map";
import { dirname, join } from "path";
import VError from "verror";
import {
  Commands,
  GenerateProxy,
  OpSettings,
  FileConfig,
} from "../types/index.js";
import {
  directoryTraversal,
  getCliRoot,
  getPkg,
  getProjectRoot,
  setPkg,
} from "../utils.js";
import Operation from "./operation.js";
import { render, task, TaskManagerApi } from "../task/taskManager.js";

class GenerateOperation extends Operation<Commands.generate> {
  private filesCopied: FileConfig[] = [];
  private filesRollBacked: FileConfig[] = [];

  constructor(cli: OpSettings) {
    super(Commands.generate, cli);
  }

  public async verify(options?: GenerateProxy) {
    const template = options?.template ?? this.proxy.template;
    const name = options?.name ?? this.proxy.name;
    const destination = options?.destination ?? this.proxy.destination;
    const workspace = options?.workspace ?? this.proxy.workspace;
    const root = options?.root ?? this.proxy.root;
    const isRoot = options?.isRoot ?? this.proxy.isRoot;

    const templateExists = await fs.pathExists(template);

    if (!this.templates.includes(template) && !templateExists) {
      throw new VError("Template does not exist");
    }

    const nameMatch = /[^a-z_-]/g.test(name || "");
    if (nameMatch || name.length <= 2) {
      throw new VError(
        "Name must be lowercase, no spaces, no special characters, and at least 3 characters long"
      );
    }

    if (!root) {
      throw new VError("Workspace does not exist");
    }

    if (!isRoot && !this.workspaces.includes(workspace)) {
      throw new VError("Workspace does not exist");
    }

    if (this.apps.includes(name)) {
      throw new VError(`App ${name} already exists`);
    }

    const destinationExists = await fs.pathExists(destination);
    if (destinationExists) {
      const destinationFiles = await fs.readdir(destination);
      if (destinationFiles.length)
        throw new VError(`Destination directory has files in it`);
    }

    this.values.template = template;
    this.values.destination = destination;
    this.values.workspace = workspace;
    this.values.name = name;
    this.values.root = root;
    this.values.isRoot = isRoot;
  }

  public async prompt() {
    const answers = await this.buildPrompt({
      templates: this.templates,
      workspaces: [...this.workspaces, "root"],
    });

    const template =
      this.cli.template || answers.template || this.defaultTemplate;

    const workspace =
      this.cli.workspace || answers.workspace || this.defaultWorkspace;

    const name = this.cli.name || answers.name;

    const templatePath = join(getCliRoot(), "templates", template);

    const root = this.root ?? getProjectRoot();
    const isRoot = workspace === "root" && !this.workspaces.includes("root");
    const workspacePath = isRoot ? root : join(root, workspace || ".");

    const destinationPath = join(workspacePath, name || "");

    this.proxy.template = templatePath;
    this.proxy.workspace = workspace;
    this.proxy.destination = destinationPath;
    this.proxy.root = root;
    this.proxy.isRoot = isRoot;
    this.proxy.name = name;
  }

  private async getTemplateFiles() {
    const { template, destination } = this.values;
    const matchGlob = (await fs.readFile(join(template, ".vxmatch"), "utf8"))
      .split("\n")
      .map((v) => v.trim());

    const map = async (v, dir) => ({
      name: v,
      src: join(dir, v),
      dest: join(destination, v),
      isDir: (await fs.stat(join(dir, v))).isDirectory(),
    });

    const files = await directoryTraversal(template, matchGlob, map, {
      onlyFiles: true,
    });

    return files;
  }

  private rollBack = async (v: FileConfig) => {
    const exists = await fs.pathExists(v.dest);
    if (exists) {
      await fs.remove(v.dest);
      this.filesRollBacked.push(v);
    }

    return v;
  };

  private moveFile = async (v: FileConfig) => {
    const { src, dest } = v;
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
    await fs.mkdirp(dirname(dest));
    await fs.copy(src, dest);
    this.filesCopied.push(v);

    return v;
  };

  private appendToWorkspace() {
    if (this.values.isRoot) {
      const pkg = getPkg(this.values.root);
      let workspaces = pkg.workspaces ?? [];
      if (workspaces) {
        if (Array.isArray(workspaces)) {
          workspaces.push(this.values.name);
        } else {
          workspaces.packages.push(this.values.name);
        }
      } else {
        workspaces = [this.values.name];
      }

      setPkg(this.values.root, {
        workspaces,
      });
    }
  }

  rollbackFiles = async (t: TaskManagerApi) => {
    const settings: PMap.Options = {
      concurrency: 1 ?? this.cli.concurrency ?? 1,
    };

    t.setStatus("loading");
    const files = this.filesCopied;

    await pMap(
      files,
      async (v, i) => {
        t.setMessage(`Rolling Back: ${v.name}`);
        t.setProgress((i + 1) / files.length);
        return await this.rollBack(v);
      },
      settings
    );

    await fs.remove(this.values.destination);
    t.setStatus("success");
  };

  moveFiles = async (t: TaskManagerApi) => {
    const settings: PMap.Options = {
      concurrency: 1 ?? this.cli.concurrency ?? 1,
    };

    const files = await this.getTemplateFiles();

    t.setStatus("loading");
    await pMap(
      files,
      async (v, i) => {
        t.setMessage(`Copying: ${v.name}`);
        t.setProgress((i + 1) / files.length);
        return await this.moveFile(v);
      },
      settings
    );
    t.setStatus("success");
  };

  setupApp = (t: TaskManagerApi) => {
    t.setStatus("loading");
    this.appendToWorkspace();
    console.log(this.values.root, this.values.name);
    setPkg(this.values.destination, { name: this.values.name });
    t.setStatus("success");
  };

  process = async () => {
    const pipeline = task("Generating files", ({ task, taskFail }) => {
      taskFail(({ task }) => {
        task("Rolling back files", "loading", async (t) => {
          await this.rollbackFiles(t);
        });
      });

      task("Copying", async (t) => {
        await this.moveFiles(t);
      });

      task(`Setting up ${this.values.name}`, async (t) => {
        this.setupApp(t);
      });
    });

    await render([pipeline]);
  };
}

export default GenerateOperation;
