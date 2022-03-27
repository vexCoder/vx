import { join } from "path";
import VError from "verror";
import fs from "fs-extra";
import { PackageJson } from "type-fest";
import Operation from "./operation.js";
import { Commands, OpSettings, GenerateProxy } from "../types/index.js";
import { directoryTraversal, getCliRoot, getProjectRoot } from "../utils.js";

class GenerateOperation extends Operation<Commands.generate> {
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

  private async getTemplateFiles() {
    const { template, destination } = this.values;
    const matchGlob = (await fs.readFile(join(template, ".vxmatch"), "utf8"))
      .split("\n")
      .map((v) => v.trim());

    return (
      await directoryTraversal(template, matchGlob, async (v, dir) => ({
        src: join(dir, v),
        dest: join(destination, v),
        isDir: (await fs.stat(join(dir, v))).isDirectory(),
      }))
    ).sort((a, b) => {
      if (a.isDir === b.isDir) return 0;
      if (a.isDir) return -1;
      return 1;
    });
  }

  private filesCopied: string[] = [];
  private filesRollBacked: string[] = [];

  private async rollBack() {
    const removed = [];
    await Promise.all(
      this.filesCopied.map(async (v) => {
        const exists = await fs.pathExists(v);
        if (exists) {
          await fs.remove(v);
          this.filesRollBacked.push(v);
          removed.push(v);
        }
      })
    );

    return removed;
  }

  private async moveFiles() {
    const files = await this.getTemplateFiles();
    const copies = [];
    await Promise.all(
      files.map(async (v) => {
        const { src, dest, isDir } = v;
        const exists = await fs.pathExists(dest);
        if (exists) {
          throw new VError(`File ${dest} already exists`);
        } else if (isDir) {
          await fs.mkdir(dest);
        } else {
          await fs.copyFile(src, dest);
        }
        this.filesCopied.push(dest);
        copies.push(dest);
      })
    );

    return copies;
  }

  private async createDirIfNotExists(path: string) {
    const exists = await fs.pathExists(path);
    if (!exists) await fs.mkdir(path);
  }

  private async updateDestPkg(partial: Partial<PackageJson>) {
    const pkg = join(this.values.destination, "package.json");
    const exists = await fs.pathExists(pkg);
    if (!exists) {
      throw new VError("No package.json found");
    }

    const json = await fs.readJson(pkg);
    const updated = { ...json, ...partial };
    await fs.writeJson(pkg, updated, { spaces: 2 });
  }

  async process() {
    const { destination, workspace } = this.values;

    try {
      await this.createDirIfNotExists(workspace);
      await this.createDirIfNotExists(destination);
      await this.moveFiles();
      await this.updateDestPkg({ name: this.values.name });
    } catch (error) {
      await this.rollBack();
      console.error(error);
    }
  }
}

export default GenerateOperation;
