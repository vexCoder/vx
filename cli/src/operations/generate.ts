import consola from "consola";
import fs from "fs-extra";
import { Listr } from "listr2";
import * as PMap from "p-map";
import { dirname, join } from "path";
import VError from "verror";
import { Commands, GenerateProxy, OpSettings } from "../types/index.js";
import {
  directoryTraversal,
  getCliRoot,
  getPkg,
  getProjectRoot,
  iterableLoader,
  setPkg,
} from "../utils.js";
import Operation from "./operation.js";

class GenerateOperation extends Operation<Commands.generate> {
  private filesCopied: string[] = [];
  private filesRollBacked: string[] = [];

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

    return files.sort((a, b) => {
      if (a.isDir === b.isDir) return 0;
      if (a.isDir) return -1;
      return 1;
    });
  }

  private async rollBack(v: string) {
    const exists = await fs.pathExists(v);
    if (exists) {
      await fs.remove(v);
    }

    return v;
  }

  private async moveFile<T extends { src: string; dest: string }>(v: T) {
    const { src, dest } = v;
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
    await fs.mkdirp(dirname(dest));
    await fs.copy(src, dest);

    return dest;
  }

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

  async process() {
    const settings: PMap.Options = { concurrency: this.cli.concurrency ?? 1 };

    type ThisType = this;
    interface TaskContext {
      complete: boolean;
      op: ThisType;
    }

    const tasks = new Listr<TaskContext>(
      [
        {
          title: `Generating files: ${this.values.destination}`,
          async task(_, task) {
            return task.newListr([
              {
                title: "Copying",
                task: async (ctx, copyTask) => {
                  const files = await ctx.op.getTemplateFiles();
                  await iterableLoader(files, {
                    ...settings,
                    map: ctx.op.moveFile,
                    messager: (v) => {
                      copyTask.title = `Copying: ${v.name}`;
                    },
                  });
                  ctx.complete = true;
                },
              },
            ]);
          },
        },
        {
          title: `Setting up ${this.values.name}`,
          skip: (ctx) => !ctx.complete,
          task: (ctx) => {
            this.appendToWorkspace();
            setPkg(ctx.op.values.root, { name: ctx.op.values.name });
          },
        },
        {
          title: `Rolling back`,
          enabled: (ctx) => ctx.complete || this.filesCopied.length === 0,
          async task(_, task) {
            return task.newListr([
              {
                title: "Copying",
                task: async (ctx, roolbackTask) => {
                  await iterableLoader(ctx.op.filesCopied, {
                    ...settings,
                    map: ctx.op.rollBack,
                    messager: (v) => {
                      roolbackTask.title = `Rolling back: ${v}`;
                    },
                  });
                },
              },
            ]);
          },
        },
      ],
      {
        concurrent: false,
        ctx: { complete: false, op: this },
      }
    );

    try {
      await tasks.run();
      consola.success(`${this.values.name} App created successfully`);
    } catch (error) {
      consola.error(error);
    }
  }
}

export default GenerateOperation;
