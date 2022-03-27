import { join, dirname } from "path";
import VError from "verror";
import fs from "fs-extra";
import { PackageJson } from "type-fest";
import * as PMap from "p-map";
import Operation from "./operation.js";
import {
  Commands,
  OpSettings,
  GenerateProxy,
  CopyFilesConfig,
} from "../types/index.js";
import {
  directoryTraversal,
  getCliRoot,
  getProjectRoot,
  setPkg,
  spinnerBuilder,
} from "../utils.js";

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
    this.proxy.isRoot = isRoot;
    this.proxy.name = name;
  }

  private async getTemplateFiles(): Promise<CopyFilesConfig[]> {
    const { template, destination } = this.values;
    const matchGlob = (await fs.readFile(join(template, ".vxmatch"), "utf8"))
      .split("\n")
      .map((v) => v.trim());

    const map = async (v, dir) => ({
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

  private async updateDestPkg(partial: Partial<PackageJson> = {}) {
    setPkg(this.values.destination, {
      ...partial,
    });
  }

  private async rollBack(v: string) {
    const exists = await fs.pathExists(v);
    if (exists) {
      await fs.remove(v);
    }

    return v;
  }

  private async moveFile(v: CopyFilesConfig) {
    const { src, dest } = v;
    await fs.mkdirp(dirname(dest));
    await fs.copy(src, dest);

    return dest;
  }

  async process() {
    const settings: PMap.Options = { concurrency: this.cli.concurrency ?? 1 };

    try {
      const files = await this.getTemplateFiles();
      const spinner = spinnerBuilder(files, settings, (v) => `Copied ${v}`);
      this.filesCopied = await spinner(this.moveFile);
      await this.updateDestPkg({ name: this.values.name });
    } catch (error) {
      const spinner = spinnerBuilder(
        this.filesCopied,
        settings,
        (v) => `Rolled-back ${v}`
      );
      this.filesRollBacked = await spinner(this.rollBack);
      console.error(error);
    }
  }
}

export default GenerateOperation;
